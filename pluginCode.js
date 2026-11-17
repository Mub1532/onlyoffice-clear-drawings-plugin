const clearDrawingsButtonId = "clearDrawings";

const clearDrawingsToolbarConfig = {
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
        },
      ],
    },
  ],
};

// runs inside the editor, so it cant use anything outside itself
function deleteNonImageDrawings() {
  const drawings = Api.GetDocument().GetAllDrawingObjects();

  for (const drawing of drawings) {
    try {
      if (drawing.GetClassType() === "image") continue;
      drawing.Delete();
    } catch {}
  }
}

function addClearDrawingsButton() {
  // guid only exists once init runs
  const { guid } = window.Asc.plugin;
  if (!guid) return;

  const toolbarItem = { ...clearDrawingsToolbarConfig, guid };
  try {
    window.Asc.plugin.executeMethod("AddToolbarMenuItem", [toolbarItem]);
  } catch (error) {
    console.error("couldnt add clear drawings button", error);
  }
}

function clearDrawings(buttonId) {
  if (buttonId !== clearDrawingsButtonId) return;

  try {
    window.Asc.plugin.callCommand(deleteNonImageDrawings, false, true);
  } catch (error) {
    console.error("couldnt clear drawings", error);
  }
}

window.Asc.plugin.init = addClearDrawingsButton;
window.Asc.plugin.event_onToolbarMenuClick = clearDrawings;
window.Asc.plugin.button = () => {};
