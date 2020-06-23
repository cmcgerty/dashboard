/*
  All Emoncms code is released under the GNU Affero General Public License.
  See COPYRIGHT.txt and LICENSE.txt.
    ---------------------------------------------------------------------
    Part of the OpenEnergyMonitor project:
    http://openenergymonitor.org

    Batterybw author: Colin McGerty : colin@mcgerty.co.uk
    Standing on the shoulders of: Trystan Lea: trystan.lea@googlemail.com
    And: Andreas Messerli firefox7518@gmail.com
    If you have any questions please get in touch, try the forums here:
    http://openenergymonitor.org/emon/forum
 */
 
 function addOption(widget, optionKey, optionType, optionName, optionHint, optionData)
{
  widget["options"    ].push(optionKey);
  widget["optionstype"].push(optionType);
  widget["optionsname"].push(optionName);
  widget["optionshint"].push(optionHint);
  widget["optionsdata"].push(optionData);
}

function batterybw_widgetlist()
{
  var widgets =
  {
    "batterybw":
    {
      "offsetx":-40,"offsety":-30,"width":120,"height":60,
      "menu":"Widgets",
      "options":    [],
      "optionstype":[],
      "optionsname":[],
      "optionshint":[],
      "optionsdata":[]
    }
  };

	addOption(widgets["batterybw"], "feedid",   "feedid",  _Tr("Feed"),     _Tr("Feed value"),      []);
	addOption(widgets["batterybw"], "timeout",  "value",   _Tr("Timeout"),    _Tr("Timeout without feed update in seconds (empty is never)"),   []);
	addOption(widgets["batterybw"], "errormessagedisplayed",    "value",  _Tr("Error Message"),   _Tr("Error message displayed when timeout is reached"),   []);
	return widgets;
}

function draw_batterybw(batterybw,width,height,val,iconName,errorCode,errorMessage)
{
    batterybw.css({
    });

    if (errorCode === "1")
    {
        batterybw.html(errorMessage);
    }
    else
    {
        batterybw.html("<img src=\"/Modules/dashboard/widget/batterybw/"+iconName+"\">");
    }
}

function batterybw_draw()
{
    $(".batterybw").each(function(index)
    {
        var batterybw = $(this);
        var errorMessage = $(this).attr("errormessagedisplayed");
        if (errorMessage === "" || errorMessage === undefined){            //Error Message parameter is empty
          errorMessage = "TO Error";
        }
        var errorTimeout = batterybw.attr("timeout");
        if (errorTimeout === "" || errorTimeout === undefined){           //Timeout parameter is empty
            errorTimeout = 0;
        }

        var feedid = batterybw.attr("feedid");
        if (assocfeed[feedid]!=undefined) feedid = assocfeed[feedid]; // convert tag:name to feedid
        if (associd[feedid] === undefined) { console.log("Review config for feed id of " + batterybw.attr("class")); return; }
        var val = associd[feedid]["value"] * 1;

        if (val===undefined) {val = 0;}
        if (isNaN(val))  {val = 0;}

        var icon = 0 
        if (val > 0 && val <= 20)
        {
            icon = 0;
        }
        else if (val > 20 && val <= 40)
        {
            icon = 25;
        }
        else if (val > 40 && val <= 60)
        {
            icon = 50;
        }
        else if (val > 60 && val <= 80)
        {
            icon = 75;
        }
        else if (val > 80 && val <= 100)
        {
            icon = 100;
        }

        var iconName = "Battery-"+icon+".png";

        var errorCode = "0";
        if (errorTimeout !== 0)
        {
            if (((new Date()).getTime() / 1000 - offsetofTime - (associd[feedid]["time"] * 1)) > errorTimeout) 
            {
                errorCode = "1";
            }
        }

        draw_batterybw(
            batterybw,
            batterybw.width(),
            batterybw.height(),
            val,
            iconName,
            errorCode,
            errorMessage
        );
    });
}

function batterybw_init()
{
    $(".batterybw").html("");
}
function batterybw_slowupdate()
{
	  batterybw_draw();
}
function batterybw_fastupdate()
{
	  batterybw_draw();
}
