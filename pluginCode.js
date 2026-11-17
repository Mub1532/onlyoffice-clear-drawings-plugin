const clearDrawingsButtonId = "clearDrawings";

const clearDrawingsToolbarConfig = {
  guid: window.Asc.plugin.guid,
  tabs: [
    {
      id: "draw",
      text: "Draw",
      items: [
        {
          id: clearDrawingsButtonId,
          type: "big-button",
          text: "Clear Drawings",
          hint: "Remove all pen and highlighter drawings",
          lockInViewMode: true,
          icons: "resources/%theme-type%(light|dark)/icon%scale%(default).%extension%(svg)",
          items: [],
        },
      ],
    },
  ],
};

// runs inside the editor, so it cant use anything outside itself
function deleteNonImageDrawings() {
  const drawings = Api.GetDocument().GetAllDrawingObjects();

  for (const drawing of drawings) {
    if (drawing.GetClassType() === "image") continue;
    drawing.Delete();
  }
}

function addClearDrawingsButton() {
  window.Asc.plugin.executeMethod("AddToolbarMenuItem", [clearDrawingsToolbarConfig]);
}

function clearDrawings(buttonId) {
  if (buttonId !== clearDrawingsButtonId) return;
  window.Asc.plugin.callCommand(deleteNonImageDrawings, false, true);
}

window.Asc.plugin.init = addClearDrawingsButton;
window.Asc.plugin.event_onToolbarMenuClick = clearDrawings;
window.Asc.plugin.button = () => {};
