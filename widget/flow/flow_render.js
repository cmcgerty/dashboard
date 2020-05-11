/*
  All Emoncms code is released under the GNU Affero General Public License.
  See COPYRIGHT.txt and LICENSE.txt.
    ---------------------------------------------------------------------
    Part of the OpenEnergyMonitor project:
    http://openenergymonitor.org

    Flow author: Colin McGerty : colin@mcgerty.co.uk
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

function flow_widgetlist()
{
  var widgets =
  {
    "flow":
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
   var colouroptions = [
      [1, _Tr("Black")],
      [0, _Tr("White")]
   ];

	addOption(widgets["flow"], "feedid",   "feedid",  _Tr("Feed"),     _Tr("Feed value"),      []);
        addOption(widgets["flow"], "colour",     "dropbox",  _Tr("Colour"),     _Tr(""),      colouroptions);
        addOption(widgets["flow"], "rotate",  "value",   _Tr("Rotate"),    _Tr("Degrees to rotate the flow line (empty is zero)"),   []);
        addOption(widgets["flow"], "threshold1",  "value",   _Tr("Zero threshold"),    _Tr("No movement is shown below this value. Default 0.05"),   []);
        addOption(widgets["flow"], "threshold2",  "value",   _Tr("Slow threshold"),    _Tr("Slow movement is shown below this value. Default 0.5"),   []);
	addOption(widgets["flow"], "timeout",  "value",   _Tr("Timeout"),    _Tr("Timeout without feed update in seconds (empty is never)"),   []);
	addOption(widgets["flow"], "errormessagedisplayed",    "value",  _Tr("Error Message"),   _Tr("Error message displayed when timeout is reached"),   []);
	return widgets;
}

function draw_flow(flow,width,height,val,rotate,iconName,errorCode,errorMessage)
{
    flow.css({
    });

    if (errorCode === "1")
    {
        flow.html(errorMessage);
    }
    else
    {
        flow.html("<img style=\"-webkit-transform: rotate("+rotate+"deg); -ms-transform: rotate("+rotate+"deg); transform: rotate("+rotate+"deg);\" src=\"/Modules/dashboard/widget/flow/"+iconName+"\">");
    }
}

function flow_draw()
{
    $(".flow").each(function(index)
    {
        var flow = $(this);
        var errorMessage = $(this).attr("errormessagedisplayed");
        if (errorMessage === "" || errorMessage === undefined){            //Error Message parameter is empty
          errorMessage = "TO Error";
        }
        var errorTimeout = flow.attr("timeout");
        if (errorTimeout === "" || errorTimeout === undefined){           //Timeout parameter is empty
            errorTimeout = 0;
        }

        var feedid = flow.attr("feedid");
        if (assocfeed[feedid]!=undefined) feedid = assocfeed[feedid]; // convert tag:name to feedid
        if (associd[feedid] === undefined) { console.log("Review config for feed id of " + flow.attr("class")); return; }
        var val = associd[feedid]["value"] * 1;

        if (val===undefined) {val = 0;}
        if (isNaN(val))  {val = 0;}

	var rotate = flow.attr("rotate") * 1;
	if (rotate===undefined) {rotate = 0;}
        if (isNaN(rotate))  {rotate = 0;}
        rotate = rotate -1 //the gif isn't quite straight!

	if (val < 0)
        {
            rotate = rotate + 180;
        }

        var threshold1 = flow.attr("threshold1") * 1;
        if (threshold1===undefined) {threshold1 = 0;}
        if (isNaN(threshold1))  {threshold1 = 0;}

        var threshold2 = flow.attr("threshold2") * 1;
        if (threshold2===undefined) {threshold2 = 0;}
        if (isNaN(threshold2))  {threshold2 = 0;}

        var colour = flow.attr("colour") * 1;
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
                speed = "fast";
            }
        }
        var iconName = "flow-"+colour+"-"+speed+".gif";

        var errorCode = "0";
        if (errorTimeout !== 0)
        {
            if (((new Date()).getTime() / 1000 - offsetofTime - (associd[feedid]["time"] * 1)) > errorTimeout) 
            {
                errorCode = "1";
            }
        }

        draw_flow(
            flow,
            flow.width(),
            flow.height(),
            val,
            rotate,
            iconName,
            errorCode,
            errorMessage
        );
    });
}

function flow_init()
{
    $(".flow").html("");
}
function flow_slowupdate()
{
	  flow_draw();
}
function flow_fastupdate()
{
	  flow_draw();
}
