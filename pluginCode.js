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
  const { clearPen, clearHighlighter, editorType } = Asc.scope;
  let selectedCount = 0;

  function getAllDrawings() {
    switch (editorType) {
      case "cell":
        return Api.GetSheets().flatMap(sheet => sheet.GetAllDrawings());
      case "slide": {
        const presentation = Api.GetPresentation();
        const slides = Array.from({ length: presentation.GetSlidesCount() }, (_, slideIndex) => presentation.GetSlideByIndex(slideIndex));
        return slides.flatMap(slide => slide.GetAllDrawings());
      }
      case "pdf": {
        const pdfDocument = Api.GetDocument();
        const pages = Array.from({ length: pdfDocument.GetPagesCount() }, (_, pageIndex) => pdfDocument.GetPage(pageIndex));
        return pages.flatMap(page => page.GetAllDrawings());
      }
      default:
        return Api.GetDocument().GetAllDrawingObjects();
    }
  }

  for (const drawing of getAllDrawings()) {
    try {
      if (drawing.GetClassType() === "image") continue;
      if (drawing.GetPlaceholder?.()) continue;

      // no line means its not a pen or highlighter stroke (eg a text box)
      const strokeFill = drawing.GetLine()?.GetFill();
      if (!strokeFill) continue;

      // highlighter is half see-through (0.5), pen is solid (0)
      const isHighlighter = strokeFill.GetTransparent() > 0.25;
      if (isHighlighter ? !clearHighlighter : !clearPen) continue;

      // excel's Delete is paid only, so on the free edition select it and press Delete from outside
      if (editorType === "cell" && typeof drawing.Delete !== "function") {
        // first one replaces anything already selected, the rest get added to it
        drawing.Select(selectedCount === 0);
        selectedCount++;
        continue;
      }

      drawing.Delete();
    } catch {}
  }

  localStorage.setItem(Asc.scope.doneKey, String(selectedCount));
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

// the editor never sends callCommand results back, so it leaves a flag in shared storage
function waitForCommand(doneKey) {
  return new Promise(resolve => {
    const checkDone = setInterval(() => {
      const selectedCount = localStorage.getItem(doneKey);
      if (selectedCount === null) return;
      clearInterval(checkDone);
      localStorage.removeItem(doneKey);
      resolve(Number(selectedCount));
    }, 20);
  });
}

function pressDeleteInEditor() {
  const editorWindow = window.parent;
  const editorDocument = editorWindow.document;
  const keyTarget = editorDocument.getElementById("area_id") ?? editorDocument.activeElement ?? editorDocument.body;

  for (const eventType of ["keydown", "keyup"]) {
    const deleteKey = new editorWindow.KeyboardEvent(eventType, { key: "Delete", code: "Delete", bubbles: true, cancelable: true });
    Object.defineProperty(deleteKey, "keyCode", { get: () => 46 });
    Object.defineProperty(deleteKey, "which", { get: () => 46 });
    keyTarget.dispatchEvent(deleteKey);
  }
}

async function clearAnnotations(buttonId) {
  const options = clearOptions[buttonId];
  if (!options) return;

  const { clearPen, clearHighlighter } = options;
  window.Asc.scope.clearPen = clearPen;
  window.Asc.scope.clearHighlighter = clearHighlighter;
  const { editorType } = window.Asc.plugin.info;
  const doneKey = `clearAnnotationsDone-${Date.now()}`;
  window.Asc.scope.editorType = editorType;
  window.Asc.scope.doneKey = doneKey;

  try {
    window.Asc.plugin.callCommand(deleteAnnotations, false, true);
  } catch (error) {
    console.error("couldnt clear annotations", error);
    return;
  }

  const selectedCount = await waitForCommand(doneKey);

  // only press Delete if strokes are selected, otherwise it would clear the selected cells
  if (editorType === "cell" && selectedCount > 0) pressDeleteInEditor();
}

window.Asc.plugin.init = addClearAnnotationsButton;
window.Asc.plugin.event_onToolbarMenuClick = clearAnnotations;
window.Asc.plugin.button = () => {};
