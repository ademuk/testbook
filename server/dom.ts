import {Context} from "vm";

export const findTextNodes = (elem) => {
  let textNodes = [];
  if (elem) {
    elem.childNodes.forEach((node) => {
      if (node.nodeType === 3) {
        textNodes.push([node.parentNode, node.textContent.trim()]);
      } else if (node.nodeType === 1 || node.nodeType === 9 || node.nodeType === 11) {
        textNodes = textNodes.concat(findTextNodes(node));
      }
    });
  }
  return textNodes;
};

export const getElementTreeXPath = (element, context: Context) => {
  // https://stackoverflow.com/questions/3454526/how-to-calculate-the-xpath-position-of-an-element-using-javascript#answer-3454545

  var paths = [];  // Use nodeName (instead of localName)

  // so namespace prefix is included (if any).
  for (;element && element.nodeType === context.Node.ELEMENT_NODE; element = element.parentNode) {
    let index = 0;
    let hasFollowingSiblings = false;
    let sibling;

    for (sibling = element.previousSibling; sibling; sibling = sibling.previousSibling) {
      // Ignore document type declaration.
      if (sibling.nodeType === context.Node.DOCUMENT_TYPE_NODE) {
        continue;
      }

      if (sibling.nodeName === element.nodeName) {
        ++index;
      }
    }

    for (sibling = element.nextSibling; sibling && !hasFollowingSiblings; sibling = sibling.nextSibling) {
      if (sibling.nodeName === element.nodeName)
        hasFollowingSiblings = true;
    }

    const tagName = (element.prefix ? element.prefix + ":" : "") + element.localName;
    const pathIndex = (index || hasFollowingSiblings ? "[" + (index + 1) + "]" : "");

    paths.splice(0, 0, tagName + pathIndex);
  }

  return paths.length ? "/" + paths.join("/") : null;
};
