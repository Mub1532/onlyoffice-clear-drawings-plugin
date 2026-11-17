const clearAllButtonId = "clearAnnotations";
const clearPenButtonId = "clearPenAnnotations";
const clearHighlighterButtonId = "clearHighlighterAnnotations";

const clearAnnotationsToolbarConfig = {
  tabs: [
    {
      id: "draw",
      text: "Draw",
      items: [
        {
          id: clearAllButtonId,
          type: "big-button",
          text: "Clear Annotations",
          hint: "Remove all pen and highlighter annotations",
          lockInViewMode: true,
          split: true,
          icons: "resources/%theme-type%(light|dark)/icon%scale%(default).%extension%(svg)",
          items: [
            { id: clearPenButtonId, text: "Pen only" },
            { id: clearHighlighterButtonId, text: "Highlighter only" },
          ],
        },
      ],
    },
  ],
};

const clearOptions = {
  [clearAllButtonId]: { clearPen: true, clearHighlighter: true },
  [clearPenButtonId]: { clearPen: true, clearHighlighter: false },
  [clearHighlighterButtonId]: { clearPen: false, clearHighlighter: true },
};

// runs inside the editor, so it cant use anything outside itself except Asc.scope
function deleteAnnotations() {
  const { clearPen, clearHighlighter } = Asc.scope;
  const drawings = Api.GetDocument().GetAllDrawingObjects();

  for (const drawing of drawings) {
    try {
      if (drawing.GetClassType() === "image") continue;

      // highlighter is half see-through (127), pen is solid (255)
      const drawingData = JSON.parse(drawing.ToJSON(false, false));
      const isHighlighter = drawingData.graphic?.spPr?.ln?.fill?.transparent < 200;
      if (isHighlighter ? !clearHighlighter : !clearPen) continue;

      drawing.Delete();
    } catch {}
  }
}

function addClearAnnotationsButton() {
  // guid only exists once init runs
  const { guid } = window.Asc.plugin;
  if (!guid) return;

  const toolbarItem = { ...clearAnnotationsToolbarConfig, guid };
  try {
    window.Asc.plugin.executeMethod("AddToolbarMenuItem", [toolbarItem]);
  } catch (error) {
    console.error("couldnt add clear annotations button", error);
  }
}

function clearAnnotations(buttonId) {
  const options = clearOptions[buttonId];
  if (!options) return;

  const { clearPen, clearHighlighter } = options;
  window.Asc.scope.clearPen = clearPen;
  window.Asc.scope.clearHighlighter = clearHighlighter;

  try {
    window.Asc.plugin.callCommand(deleteAnnotations, false, true);
  } catch (error) {
    console.error("couldnt clear annotations", error);
  }
}

window.Asc.plugin.init = addClearAnnotationsButton;
window.Asc.plugin.event_onToolbarMenuClick = clearAnnotations;
window.Asc.plugin.button = () => {};
