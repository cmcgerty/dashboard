/*
 * Iconify Widget v2.1 for EmonCMS Dashboard module
 * Renders remote vector icons via Iconify Direct SVG API with 3-tier feed thresholds
 * Colin McGerty 2026
 *
 * Compatibility:
 *   v1.x  Dashboard 2.x (2.0.0 - 2.5.4). Tested on Dashboard 2.4.3 / EmonCMS 11.9.10.
 *         Does NOT work on Dashboard 3.x or 4.x - use v2.x for Dashboard 4.0.0+.
 *   v2.x  Dashboard 4.x (4.0.0 - 4.2.1) Tested on Dashboard 4.2.1 / EmonCMS 12.2.1.
 *
 * Install: copy iconify_render.js and iconify_widgets.json to Modules/dashboard/widget/iconify/
 *
 * Release Notes:
	0.1 - First version. Use iconify-icon.min.js remote script execution
	0.2 - Switched to simple url icon addressing for broad browser support
	0.3 - Added feed mesurement to allow alternative icons and colours at various threasholds
	1.0 - Bugfixes. Accepts prefix:name or prefix/name icon notation; reads live
	      feed values in view mode. Dashboard 2.x only.
	1.1 - Added Rotation option (degrees, clockwise; negative = anticlockwise).
	2.0 - Ported to Dashboard 4.x
	2.1 - Added Rotation option (degrees, clockwise; negative = anticlockwise).
 */

// 1. Widget list, read by the designer (labels, hints, defaults, box geometry).
//    The matching validation contract lives in iconify_widgets.json beside this file.
function iconify_widgetlist() {
  var widgets = {
    "iconify": {
      "offsetx": -30, "offsety": -30, "width": 60, "height": 60,
      "menu": "Widgets",
      "options": [], "optionstype": [], "optionsname": [], "optionshint": [], "optionsdata": []
    }
  };
  var w = widgets["iconify"];
  addOption(w, "icon",    "value",         _Tr("Icon Name"),   _Tr("Default Iconify icon e.g. energy-icons:solar-array-sun-20"), []);
  addOption(w, "colour",  "colour_picker", _Tr("Color"),       _Tr("Default icon color"),                                       "333333");
  addOption(w, "width",   "number",        _Tr("Width (px)"),  _Tr("Width in pixels (leave blank to auto-fit box)"),            {min: 1, max: 4000});
  addOption(w, "height",  "number",        _Tr("Height (px)"), _Tr("Height in pixels (leave blank to auto-fit box)"),           {min: 1, max: 4000});
  addOption(w, "rotate",  "number",        _Tr("Rotation (deg)"), _Tr("Rotate icon clockwise by this many degrees e.g. 90, 45, -30 (blank = 0)"), {min: -360, max: 360});
  addOption(w, "url",     "url",           _Tr("URL"),         _Tr("Optional link URL when clicked"),                           []);
  addOption(w, "feedid",  "feedid",        _Tr("Feed"),        _Tr("Feed to measure (optional)"),                               []);
  addOption(w, "thresh1", "value",         _Tr("Threshold 1"), _Tr("Trigger State 1 when feed > value"),                        []);
  addOption(w, "icon1",   "value",         _Tr("Icon 1"),      _Tr("Icon for State 1 (blank keeps default)"),                   []);
  addOption(w, "colour1", "colour_picker", _Tr("Color 1"),     _Tr("Color for State 1"),                                        "22c55e");
  addOption(w, "thresh2", "value",         _Tr("Threshold 2"), _Tr("Trigger State 2 when feed > value"),                        []);
  addOption(w, "icon2",   "value",         _Tr("Icon 2"),      _Tr("Icon for State 2 (blank keeps default)"),                   []);
  addOption(w, "colour2", "colour_picker", _Tr("Color 2"),     _Tr("Color for State 2"),                                        "f59e0b");
  addOption(w, "thresh3", "value",         _Tr("Threshold 3"), _Tr("Trigger State 3 when feed > value"),                        []);
  addOption(w, "icon3",   "value",         _Tr("Icon 3"),      _Tr("Icon for State 3 (blank keeps default)"),                   []);
  addOption(w, "colour3", "colour_picker", _Tr("Color 3"),     _Tr("Color for State 3"),                                        "ef4444");
  return widgets;
}

// 2. Helpers
function iconify_str(v) {
  return (v === undefined || v === null) ? '' : String(v).trim();
}

// The 4.x colour picker can store "none"; treat it as unset so the default applies.
function iconify_colour(v) {
  var c = iconify_str(v);
  return c.toLowerCase() === 'none' ? '' : c;
}

// Accepts energy-icons:house-48, energy-icons/house-48, .../house-48.svg,
// a full https://api.iconify.design/... URL, or a bare name (defaults to mdi).
function iconify_parse_icon(ref) {
  var iconRef = iconify_str(ref)
    .replace(/^https?:\/\/[^\/]+\//i, '')
    .replace(/[?#].*$/, '')
    .replace(/\.svg$/i, '')
    .replace(/^\/+|\/+$/g, '');
  var m = iconRef.match(/^([^:\/]+)[:\/](.+)$/);
  return { prefix: m ? m[1] : 'mdi', name: m ? m[2] : iconRef };
}

// Edit mode only. designer.unconfigured() flags any widget with an empty feedid
// option as "not configured", but the feed is optional here: an icon on its own
// is a complete widget. Wrap it so iconify boxes are only flagged when no option
// at all has been set. Other widget types are passed straight through.
// designer.js loads after this script, so this runs from mount(), not at load.
function iconify_patch_designer() {
  if (typeof designer === 'undefined' || !designer ||
      typeof designer.unconfigured !== 'function' || designer.unconfigured._iconify) {
    return;
  }
  var original = designer.unconfigured;
  var patched = function (id) {
    var box = designer.boxlist && designer.boxlist[id];
    if (!box || box.type !== 'iconify') return original.apply(this, arguments);

    var widget = designer.widget_by_id(id);
    var opts = (widget && widget.options) || {};
    for (var k in opts) {
      if (!opts.hasOwnProperty(k)) continue;
      // Colour pickers always save a value, so they don't count as configuration.
      if (/^colour\d?$/.test(k)) continue;
      if (iconify_str(opts[k]) !== '') return null;
    }
    return _Tr("not configured");
  };
  patched._iconify = true;
  designer.unconfigured = patched;
  if (typeof designer.draw === 'function') designer.draw(); // clear any note already drawn
}

// 3. Widget interface for Dashboard 4.x render.js
//    config = the box's attributes (lowercase names), ctx.feeds = live feed values.
var iconify_widget = {
  mount: function (el, config, ctx) {
    iconify_patch_designer();
    var feeds = ctx.feeds;
    var rendered = '';   // signature of what is currently drawn

    var baseIcon = iconify_str(config.icon) || 'mdi:home-lightning-bolt-outline';
    var baseColour = iconify_colour(config.colour) || '333333';
    var targetUrl = iconify_str(config.url);

    // Rotation in degrees (clockwise). Blank or invalid = no rotation.
    var rotation = parseFloat(config.rotate);
    if (isNaN(rotation)) rotation = 0;
    rotation = rotation % 360;

    var states = [];
    for (var i = 3; i >= 1; i--) {  // highest threshold takes priority
      var t = parseFloat(config['thresh' + i]);
      if (isNaN(t)) continue;
      states.push({
        thresh: t,
        icon: iconify_str(config['icon' + i]) || baseIcon,
        colour: iconify_colour(config['colour' + i]) || baseColour
      });
    }

    var draw = function () {
      var activeIcon = baseIcon;
      var activeColour = baseColour;

      var feed = config.feedid ? feeds.get(config.feedid) : null;
      var feedVal = feed ? parseFloat(feed.value) : NaN;
      if (!isNaN(feedVal)) {
        for (var s = 0; s < states.length; s++) {
          if (feedVal > states[s].thresh) {
            activeIcon = states[s].icon;
            activeColour = states[s].colour;
            break;
          }
        }
      }

      var icon = iconify_parse_icon(activeIcon);
      var fullIcon = icon.prefix + ':' + icon.name;
      var cssColour = activeColour.charAt(0) === '#' ? activeColour : '#' + activeColour;

      var optWidth = parseInt(config.width, 10);
      var optHeight = parseInt(config.height, 10);
      var finalWidth = (optWidth > 0) ? optWidth : (el.clientWidth || 48);
      var finalHeight = (optHeight > 0) ? optHeight : (el.clientHeight || 48);

      var signature = fullIcon + '|' + cssColour + '|' + finalWidth + '|' + finalHeight + '|' + rotation;
      if (signature === rendered) return;
      rendered = signature;

      var svgUrl = 'https://api.iconify.design/' +
        encodeURIComponent(icon.prefix) + '/' + encodeURIComponent(icon.name) + '.svg' +
        '?color=' + encodeURIComponent(cssColour) +
        '&width=' + encodeURIComponent(finalWidth) +
        '&height=' + encodeURIComponent(finalHeight);

      var img = document.createElement('img');
      img.src = svgUrl;
      img.alt = fullIcon;
      img.style.width = finalWidth + 'px';
      img.style.height = finalHeight + 'px';
      img.style.display = 'inline-block';
      img.style.verticalAlign = 'top';
      img.style.border = '0';
      if (rotation !== 0) {
        img.style.transform = 'rotate(' + rotation + 'deg)';
        img.style.transformOrigin = '50% 50%';
      }

      var content = img;
      if (targetUrl !== '') {
        content = document.createElement('a');
        content.href = targetUrl;
        content.style.display = 'inline-block';
        content.style.lineHeight = '1';
        content.style.textDecoration = 'none';
        content.appendChild(img);
      }

      el.innerHTML = '';
      el.appendChild(content);
    };

    draw();  // draw the default icon straight away, before the first feed poll

    return {
      update: function (live) { feeds = live; draw(); },  // every 5s after feed/list.json
      resize: function () { draw(); },                     // box resized in the designer
      destroy: function () { el.innerHTML = ''; }
    };
  }
};
