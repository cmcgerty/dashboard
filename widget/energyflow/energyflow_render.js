/*
  All Emoncms code is released under the GNU Affero General Public License.
  See COPYRIGHT.txt and LICENSE.txt.
    ---------------------------------------------------------------------
    Part of the OpenEnergyMonitor project:
    http://openenergymonitor.org
    EnergyFlow author: Colin McGerty : colin@mcgerty.co.uk
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

function energyflow_widgetlist()
{
  var widgets =
  {
    "energyflow":
    {
      "offsetx":-40,"offsety":-30,"width":120,"height":120,
      "menu":"Widgets",
      "options":    [],
      "optionstype":[],
      "optionsname":[],
      "optionshint":[],
      "optionsdata":[]
    }
  };
   var colouroptions = [
      [1, _Tr("Black")],
      [0, _Tr("White")]
   ];

	addOption(widgets["energyflow"], "feedid",   "feedid",  _Tr("Feed"),     _Tr("Feed value"),      []);
        addOption(widgets["energyflow"], "colour",     "dropbox",  _Tr("Colour"),     _Tr(""),      colouroptions);
        addOption(widgets["energyflow"], "rotate",  "value",   _Tr("Rotate"),    _Tr("Degrees to rotate the energyflow line (empty is zero)"),   []);
        addOption(widgets["energyflow"], "threshold1",  "value",   _Tr("Zero threshold"),    _Tr("No movement is shown below this value. Default 0.1"),   []);
        addOption(widgets["energyflow"], "threshold2",  "value",   _Tr("Slow threshold"),    _Tr("Slow movement is shown below this value. Default 1"),   []);
        addOption(widgets["energyflow"], "threshold3",  "value",   _Tr("Medium threshold"),    _Tr("Medium movement is shown below this value. Default 3"),   []);
	addOption(widgets["energyflow"], "timeout",  "value",   _Tr("Timeout"),    _Tr("Timeout without feed update in seconds (empty is never)"),   []);
	addOption(widgets["energyflow"], "errormessagedisplayed",    "value",  _Tr("Error Message"),   _Tr("Error message displayed when timeout is reached"),   []);
	return widgets;
}

function draw_energyflow(energyflow,width,height,val,rotate,colour,speed,errorCode,errorMessage)
{
    energyflow.css({
        "transform":"rotate("+rotate+"deg)",
        "overflow":"hidden",
    });

    var div = document.createElement("div");
    div.setAttribute('class', 'energyflowInnerDiv');

    div.innerHTML += "  <img class=\"energyflowArrowshaft\" src=\"/Modules/dashboard/widget/energyflow/shaft-"+colour+".gif\">";
    if (speed === "slow") {
        div.innerHTML += "  <img class=\"energyflowArrowheadSlow1\" src=\"/Modules/dashboard/widget/energyflow/head-"+colour+".gif\">";
    } else if (speed === "med") {
        div.innerHTML += "  <img class=\"energyflowArrowheadMed1\" src=\"/Modules/dashboard/widget/energyflow/head-"+colour+".gif\">";
        div.innerHTML += "  <img class=\"energyflowArrowheadMed2\" src=\"/Modules/dashboard/widget/energyflow/head-"+colour+".gif\">";
    } else if (speed === "fast") {
        div.innerHTML += "  <img class=\"energyflowArrowheadFast1\" src=\"/Modules/dashboard/widget/energyflow/head-"+colour+".gif\">";
        div.innerHTML += "  <img class=\"energyflowArrowheadFast2\" src=\"/Modules/dashboard/widget/energyflow/head-"+colour+".gif\">";
        div.innerHTML += "  <img class=\"energyflowArrowheadFast3\" src=\"/Modules/dashboard/widget/energyflow/head-"+colour+".gif\">";
    }

    if (errorCode === "1")
    {
        energyflow.html(errorMessage);
    }
    else
    {
        energyflow.html(div);
    }
}

function energyflow_draw()
{
    $(".energyflow").each(function(index)
    {
        var energyflow = $(this);
        var errorMessage = $(this).attr("errormessagedisplayed");
        if (errorMessage === "" || errorMessage === undefined){            //Error Message parameter is empty
          errorMessage = "TO Error";
        }
        var errorTimeout = energyflow.attr("timeout");
        if (errorTimeout === "" || errorTimeout === undefined){           //Timeout parameter is empty
            errorTimeout = 0;
        }

        var feedid = energyflow.attr("feedid");
        if (assocfeed[feedid]!=undefined) feedid = assocfeed[feedid]; // convert tag:name to feedid
        if (associd[feedid] === undefined) { console.log("Review config for feed id of " + energyflow.attr("class")); return; }
        var val = associd[feedid]["value"] * 1;

        if (val===undefined) {val = 0;}
        if (isNaN(val))  {val = 0;}

	var rotate = energyflow.attr("rotate") * 1;
	if (rotate===undefined) {rotate = 0;}
        if (isNaN(rotate))  {rotate = 0;}

	if (val < 0)
        {
            rotate = rotate + 180;
        }

        //var threshold1 = 0.1;
        var threshold1 = energyflow.attr("threshold1") * 1;
        if (threshold1===undefined) {threshold1 = 0.1;}
        if (isNaN(threshold1))  {threshold1 = 0.1;}

        //var threshold2 = 1;
        var threshold2 = energyflow.attr("threshold2") * 1;
        if (threshold2===undefined) {threshold2 = 1;}
        if (isNaN(threshold2))  {threshold2 = 1;}

        //var threshold3 = 3;
        var threshold3 = energyflow.attr("threshold3") * 1;
        if (threshold3===undefined) {threshold3 = 3;}
        if (isNaN(threshold3))  {threshold3 = 3;}

        var colour = energyflow.attr("colour") * 1;
        if (colour == 0)
        {
            colour = "white";
        }
        else
        {
            colour = "black";
        }

        var speed = "none";
        if (val > 0)
        {
            if (val > threshold1)
            {
                speed = "slow";
            }
            if (val > threshold2)
            {
                speed = "med";
            }
            if (val > threshold3)
            {
                speed = "fast";
            }
        }
        else if (val < 0)
        {
            if (val < (threshold1 * -1))
            {
                speed = "slow";
            }
            if (val < (threshold2 * -1))
            {
                speed = "med";
            }
            if (val < (threshold3 * -1))
            {
                speed = "fast";
            }

        }

        var errorCode = "0";
        if (errorTimeout !== 0)
        {
            if (((new Date()).getTime() / 1000 - offsetofTime - (associd[feedid]["time"] * 1)) > errorTimeout) 
            {
                errorCode = "1";
            }
        }

        draw_energyflow(
            energyflow,
            energyflow.width(),
            energyflow.height(),
            val,
            rotate,
            colour,
            speed,
            errorCode,
            errorMessage
        );
    });
}

function energyflow_init()
{
          $(".energyflow").html("");
          energyflow_draw();
}
function energyflow_slowupdate()
{
	  energyflow_draw();
}
function energyflow_fastupdate()
{
//	  energyflow_draw();
}
