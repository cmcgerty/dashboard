/*
 * Iconify Widget v1.1 for EmonCMS Dashboard module
 * Renders remote vector icons via Iconify Direct SVG API with 3-tier feed thresholds
 * Colin McGerty 2026
 *
 * Compatibility:
 *   v1.x  Dashboard 2.0.0 - 2.5.4. Tested on Dashboard 2.4.3 / EmonCMS 11.9.10.
 *         Does NOT work on Dashboard 3.x or 4.x - use v2.x for Dashboard 4.0.0+.
 *
 * Install: copy iconify_render.js to Modules/dashboard/widget/iconify/
 *
 * Release Notes:
	0.1 - First version. Use iconify-icon.min.js remote script execution
	0.2 - Switched to simple url icon addressing for broad browser support
	0.3 - Added feed mesurement to allow alternative icons and colours at various threasholds
	1.0 - Bugfixes. Accepts prefix:name or prefix/name icon notation; reads live
	      feed values in view mode. Dashboard 2.x only.
	1.1 - Added Rotation option (degrees, clockwise; negative = anticlockwise).
	      Rotation is applied to a wrapping <span>, not the <img>: Dashboard 2.x's
	      AntiXSS save filter strips <img> tags whose style contains rotate(...).
 */

// 1. Dynamic Widget Registration (compatible with Dashboard 2.4.3 designer.js)
function iconify_widgetlist() {
  var widgets = {
    "iconify": {
      "offsetx": -30,
      "offsety": -30,
      "width": 60,
      "height": 60,
      "menu": "Widgets",
      "options": [
        "icon",
        "colour",
        "width",
        "height",
        "rotate",
        "url",
        "feedid",
        "thresh1",
        "icon1",
        "colour1",
        "thresh2",
        "icon2",
        "colour2",
        "thresh3",
        "icon3",
        "colour3"
      ],
      "optionstype": [
        "value",
        "colour_picker",
        "value",
        "value",
        "value",
        "value",
        "feedid",
        "value",
        "value",
        "colour_picker",
        "value",
        "value",
        "colour_picker",
        "value",
        "value",
        "colour_picker"
      ],
      "optionsname": [
        _Tr("Icon Name"),
        _Tr("Color"),
        _Tr("Width (px)"),
        _Tr("Height (px)"),
        _Tr("Rotation (deg)"),
        _Tr("URL"),
        _Tr("Feed"),
        _Tr("Threshold 1"),
        _Tr("Icon 1"),
        _Tr("Color 1"),
        _Tr("Threshold 2"),
        _Tr("Icon 2"),
        _Tr("Color 2"),
        _Tr("Threshold 3"),
        _Tr("Icon 3"),
        _Tr("Color 3")
      ],
      "optionshint": [
        _Tr("Default Iconify icon e.g. energy-icons:solar-array-sun-20"),
        _Tr("Default icon color"),
        _Tr("Width in pixels (leave blank to auto-fit box)"),
        _Tr("Height in pixels (leave blank to auto-fit box)"),
        _Tr("Rotate icon clockwise by this many degrees e.g. 90, 45, -30 (blank = 0)"),
        _Tr("Optional link URL when clicked"),
        _Tr("Feed to measure (optional)"),
        _Tr("Trigger State 1 when feed > value"),
        _Tr("Icon for State 1 (blank keeps default)"),
        _Tr("Color for State 1"),
        _Tr("Trigger State 2 when feed > value"),
        _Tr("Icon for State 2 (blank keeps default)"),
        _Tr("Color for State 2"),
        _Tr("Trigger State 3 when feed > value"),
        _Tr("Icon for State 3 (blank keeps default)"),
        _Tr("Color for State 3")
      ],
      "optionsdata": [
        [],
        "333333",
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        "22c55e",
        [],
        [],
        "f59e0b",
        [],
        [],
        "ef4444"
      ]
    }
  };
  return widgets;
}

// 2. Helper to look up live feed value from global EmonCMS feedlist
function iconify_get_feed_value(feedref) {
  if (!feedref) return null;
  feedref = String(feedref);

  // View mode (render.js): associd = {id: feed}, assocfeed = {"tag:name": id},
  // refreshed from feed/list.json every 5s. This is what the built-in widgets use.
  if (typeof associd !== 'undefined' && associd) {
    var id = feedref;
    if (typeof assocfeed !== 'undefined' && assocfeed && assocfeed[feedref] !== undefined) {
      id = assocfeed[feedref]; // convert tag:name to feed id
    }
    if (associd[id] !== undefined) {
      var v = parseFloat(associd[id].value);
      return isNaN(v) ? null : v;
    }
  }

  // Edit mode fallback: dashboard_edit_view.php defines a global feedlist array
  if (typeof feedlist === 'undefined' || !feedlist) {
    return null;
  }

  for (var f in feedlist) {
    if (!feedlist.hasOwnProperty(f)) continue;
    var feed = feedlist[f];
    if (!feed) continue;

    // Match either numeric ID or "tag:name" format
    var tagName = (feed.tag ? feed.tag + ':' + feed.name : '');
    if (String(feed.id) === String(feedref) || tagName === String(feedref)) {
      var val = parseFloat(feed.value);
      return isNaN(val) ? null : val;
    }
  }
  return null;
}

// 3. Initialisation hook called by EmonCMS when placing or loading widgets
function iconify_init() {
  iconify_draw();

  // Trigger immediate redraw when designer modal saves
  $(document).off('click.iconifySave', '#options-save').on('click.iconifySave', '#options-save', function () {
    setTimeout(iconify_draw, 50);
  });
}

// 4. Draw/Redraw hook called on dashboard load and live feed updates
function iconify_draw() {
  $('.iconify').each(function () {
    var container = $(this);

    // Base icon & colour
    var baseIcon = (container.attr('icon') || 'mdi:home-lightning-bolt-outline').trim();
    var baseColour = (container.attr('colour') || '333333').trim();

    var activeIcon = baseIcon;
    var activeColour = baseColour;

    // Evaluate feed thresholds (highest threshold takes priority)
    var feedRef = (container.attr('feedid') || '').trim();
    var feedVal = iconify_get_feed_value(feedRef);

    if (feedVal !== null) {
      var t1 = parseFloat(container.attr('thresh1'));
      var t2 = parseFloat(container.attr('thresh2'));
      var t3 = parseFloat(container.attr('thresh3'));

      if (!isNaN(t3) && feedVal > t3) {
        activeIcon = (container.attr('icon3') || '').trim() || baseIcon;
        activeColour = (container.attr('colour3') || '').trim() || baseColour;
      } else if (!isNaN(t2) && feedVal > t2) {
        activeIcon = (container.attr('icon2') || '').trim() || baseIcon;
        activeColour = (container.attr('colour2') || '').trim() || baseColour;
      } else if (!isNaN(t1) && feedVal > t1) {
        activeIcon = (container.attr('icon1') || '').trim() || baseIcon;
        activeColour = (container.attr('colour1') || '').trim() || baseColour;
      }
    }

    // Normalise icon reference. Accepts any of:
    //   energy-icons:house-48
    //   energy-icons/house-48
    //   energy-icons/house-48.svg
    //   https://api.iconify.design/energy-icons/house-48.svg?color=...
    //   house-48            (defaults to mdi set)
    var iconRef = activeIcon
      .replace(/^https?:\/\/[^\/]+\//i, '') // strip scheme + host if a full URL was pasted
      .replace(/[?#].*$/, '')               // strip query string / hash
      .replace(/\.svg$/i, '')               // strip .svg extension
      .replace(/^\/+|\/+$/g, '');           // trim stray slashes

    var sepMatch = iconRef.match(/^([^:\/]+)[:\/](.+)$/);
    var prefix = sepMatch ? sepMatch[1] : 'mdi';
    var name = sepMatch ? sepMatch[2] : iconRef;
    var fullIcon = prefix + ':' + name;
    prefix = encodeURIComponent(prefix);
    name = encodeURIComponent(name);

    // Ensure '#' prefix is present for CSS/SVG hex colour
    var cssColour = activeColour.charAt(0) === '#' ? activeColour : '#' + activeColour;

    var optWidth = parseInt(container.attr('width'), 10);
    var optHeight = parseInt(container.attr('height'), 10);
    var targetUrl = (container.attr('url') || '').trim();

    // Rotation in degrees (clockwise). Blank or invalid = no rotation.
    var rotation = parseFloat(container.attr('rotate'));
    if (isNaN(rotation)) rotation = 0;
    rotation = rotation % 360;

    // Fall back to EmonCMS bounding box dimensions if Width/Height are left blank
    var finalWidth = (!isNaN(optWidth) && optWidth > 0) ? optWidth : (container.width() || 48);
    var finalHeight = (!isNaN(optHeight) && optHeight > 0) ? optHeight : (container.height() || 48);

    // Skip DOM rebuild if active state and dimensions have not changed
    var currentSignature = fullIcon + '|' + cssColour + '|' + finalWidth + '|' + finalHeight + '|' + rotation + '|' + targetUrl;
    if (container.attr('data-rendered') === currentSignature) {
      return;
    }

    // Build direct Iconify SVG API URL
    var svgUrl = 'https://api.iconify.design/' + prefix + '/' + name + '.svg' +
      '?color=' + encodeURIComponent(cssColour) +
      '&width=' + encodeURIComponent(finalWidth) +
      '&height=' + encodeURIComponent(finalHeight);

    var imgEl = document.createElement('img');
    imgEl.setAttribute('src', svgUrl);
    imgEl.setAttribute('alt', fullIcon);
    imgEl.style.width = finalWidth + 'px';
    imgEl.style.height = finalHeight + 'px';
    imgEl.style.display = 'inline-block';
    imgEl.style.verticalAlign = 'top';
    imgEl.style.border = '0';

    // Rotate via a wrapping <span>. Putting transform:rotate() on the <img> itself
    // makes Dashboard 2.x's AntiXSS filter blank the image, and the save fails with
    // "Invalid dashboard content". The same style on a <span> passes the filter.
    var iconEl = imgEl;
    if (rotation !== 0) {
      iconEl = document.createElement('span');
      iconEl.style.display = 'inline-block';
      iconEl.style.lineHeight = '1';
      iconEl.style.transform = 'rotate(' + rotation + 'deg)';
      iconEl.style.transformOrigin = '50% 50%';
      iconEl.appendChild(imgEl);
    }

    container.empty();

    if (targetUrl !== '') {
      var linkEl = document.createElement('a');
      linkEl.setAttribute('href', targetUrl);
      linkEl.style.display = 'inline-block';
      linkEl.style.lineHeight = '1';
      linkEl.style.textDecoration = 'none';
      linkEl.appendChild(iconEl);
      container.append(linkEl);
    } else {
      container.append(iconEl);
    }

    container.attr('data-rendered', currentSignature);
  });
}

// 5. Slow/Fast update hooks expected by the EmonCMS dashboard engine
function iconify_slowupdate() {
  iconify_draw();
}

function iconify_fastupdate() {
  // Feed values only change on slowupdate (every 5s); resize/redraw is handled
  // by render.js calling iconify_init(), so nothing to do at 25fps.
}
