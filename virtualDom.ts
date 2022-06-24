// 型の定義
type TEXT_NODE = 3;

type KeyAttribute = string | number;

type DOMAttributeName = "key" | string;

interface DOMAttributes {
  key?: KeyAttribute;
  [props: string]: any; // keyやonClick、class、id等のHTMLElementの属性の名前が入ります
}

interface HandlersType {
  // eventNameはinputやsubmit, click等のoninput等のon以降の文字の小文字が入る
  [eventName: string]: (event: Event) => void;
}

type ElementAttachedNeedAttr = HTMLElement & {
  vdom?: VirtualNodeType;
  eventHandlers?: HandlersType; // handlersにイベントを入れて、oninput等のイベントを管理する
};

type TextAttachedVDom = Text & {
  vdom?: VirtualNodeType;
};

type ExpandElement = ElementAttachedNeedAttr | TextAttachedVDom;

interface VirtualNodeType {
  name: HTMLElementTagNameMap | string; // divやh1等の場合はHTMLElementTagNameMap、文字を表すVNodeの場合はstring型
  props: DOMAttributes; // HTML要素の属性
  children: VirtualNodeType[]; // 子要素のVNodeのリスト
  realNode: ExpandElement | null; // 実際の要素への参照
  nodeType: TEXT_NODE | null; // このVNodeのタイプ(文字を表すノードなのか要素を表すノードなのか)
  key: KeyAttribute | null; // keyを表す
}

// ヘルパー関数

// VNodeを作成する関数

const TEXT_NODE = 3;

const createVNode = (
  name: VirtualNodeType["name"],
  props: VirtualNodeType["props"],
  children: VirtualNodeType["children"],
  realNode?: VirtualNodeType["realNode"],
  nodeType?: VirtualNodeType["nodeType"],
  key?: KeyAttribute
): VirtualNodeType => ({
  name,
  props,
  children,
  realNode: realNode === undefined ? null : realNode,
  nodeType: nodeType === undefined ? null : nodeType,
  key: key === undefined ? null : key,
});

const createTextVNode = (
  name: string,
  realNode?: VirtualNodeType["realNode"]
) => {
  return createVNode(name, {}, [], realNode, TEXT_NODE);
};

export const h = (
  name: VirtualNodeType["name"],
  props: VirtualNodeType["props"],
  children: (VirtualNodeType | string)[],
  realNode?: VirtualNodeType["realNode"]
) => {
  const VNodeChildren: VirtualNodeType[] = [];
  for (const child of children) {
    if (typeof child === "string") {
      const textVNode = createTextVNode(child);
      VNodeChildren.push(textVNode);
    } else {
      VNodeChildren.push(child);
    }
  }

  const thisVNode = createVNode(
    name,
    props,
    VNodeChildren,
    realNode,
    null,
    props.key
  );

  return thisVNode;
};

// render関数

// 本物のElementからVNodeを作成するための関数
const createVNodeFromRealElement = (
  realElement: HTMLElement
): VirtualNodeType => {
  if (realElement.nodeType === TEXT_NODE) {
    return createTextVNode(realElement.nodeName, realElement);
  } else {
    const VNodeChildren: VirtualNodeType[] = [];
    const childrenLength = realElement.childNodes.length;
    for (let i = 0; i < childrenLength; i++) {
      const child = realElement.children.item(i);
      if (child !== null) {
        const childVNode = createVNodeFromRealElement(child as HTMLElement);
        VNodeChildren.push(childVNode);
      }
    }

    const props: VirtualNodeType["props"] = {};
    if (realElement.hasAttributes()) {
      const attributes = realElement.attributes;
      const attrLength = attributes.length;
      for (let i = 0; i < attrLength; i++) {
        const { name, value } = attributes[i];
        props[name] = value;
      }
    }

    const VNode = createVNode(
      realElement.nodeName.toLowerCase(),
      props,
      VNodeChildren,
      realElement,
      null
    );

    return VNode;
  }
};

const renderTextNode = (
  realNode: VirtualNodeType["realNode"],
  newVNode: VirtualNodeType
) => {
  // Text要素の更新、消去処理
  if (realNode !== null) {
    if (typeof newVNode.name === "string") {
      realNode.nodeValue = newVNode.name;
      return realNode;
    } else {
      console.error(
        "Error! renderTextNode does not work, because rendering nodeType is TEXT_NODE, but newNode.name is not string."
      );
      return realNode;
    }
  } else {
    console.error(
      "Error! renderTextNode does not work, because rendering nodeType is TEXT_NODE, but realNode is null. can't add text to node"
    );
    return realNode;
  }
};

// NOTE ElementAttachedNeedAttr.handlersに存在する関数を呼びだすだけの関数
// イベント追加時にこれをaddEventListenerする事でイベント変更時にElementAttachedNeedAttr.handlersの関数を変えるだけで良い
const listenerFunc = (event: Event) => {
  const realNode = event.currentTarget as ElementAttachedNeedAttr;
  if (realNode.eventHandlers !== undefined) {
    realNode.eventHandlers[event.type](event);
  }
};

const patchProperty = (
  realNode: ElementAttachedNeedAttr,
  propName: DOMAttributeName,
  oldPropValue: any,
  newPropValue: any
) => {
  // NOTE key属性は一つのrealNodeに対して固有でないといけないから変更しない
  if (propName === "key") {
  }
  // イベントリスナー属性
  else if (propName[0] === "o" && propName[1] === "n") {
    const eventName = propName.slice(2).toLowerCase();

    if (realNode.eventHandlers === undefined) {
      realNode.eventHandlers = {};
    }

    realNode.eventHandlers[eventName] = newPropValue;

    if (
      newPropValue === null ||
      newPropValue === undefined ||
      newPropValue === false
    ) {
      realNode.removeEventListener(eventName, listenerFunc);
    } else if (!oldPropValue) {
      realNode.addEventListener(eventName, listenerFunc);
    }
  }
  // 属性を削除する場合
  else if (newPropValue === null || newPropValue === undefined) {
    realNode.removeAttribute(propName);
  } else {
    realNode.setAttribute(propName, newPropValue);
  }
};

const createRealNodeFromVNode = (VNode: VirtualNodeType) => {
  let realNode: ElementAttachedNeedAttr | TextAttachedVDom;
  if (VNode.nodeType === TEXT_NODE) {
    if (typeof VNode.name === "string") {
      realNode = document.createTextNode(VNode.name);
      // NOTE 要素を新しく作成する場合はchildrenに対してcreateRealNodeFromVNodeを再起的に
      // 呼んでいる関係でここでVNodeとrealNodeの相互参照を作成する
      VNode.realNode = realNode;
      realNode.vdom = VNode;
    } else {
      console.error(
        "Error! createRealNodeFromVNode does not work, because rendering nodeType is TEXT_NODE, but VNode.name is not string"
      );
      return null;
    }
  } else {
    realNode = document.createElement(VNode.name as string);
    for (const propName in VNode.props) {
      patchProperty(realNode, propName, null, VNode.props[propName]);
    }
    // NOTE 要素を新しく作成する場合はchildrenに対してcreateRealNodeFromVNodeを再起的に
    // 呼んでいる関係でここでVNodeとrealNodeの相互参照を作成する
    VNode.realNode = realNode;
    realNode.vdom = VNode;

    for (const child of VNode.children) {
      const realChildNode = createRealNodeFromVNode(child);
      if (realChildNode !== null) {
        realNode.append(realChildNode);
      }
    }
  }
  return realNode;
};

const renderNode = (
  parentNode: HTMLElement,
  realNode: VirtualNodeType["realNode"],
  oldVNode: VirtualNodeType | null,
  newVNode: VirtualNodeType
) => {
  // 以前と変わっていない場合何もしない処理
  if (newVNode === oldVNode) {
  } else if (
    oldVNode !== null &&
    newVNode.nodeType === TEXT_NODE &&
    oldVNode.nodeType === TEXT_NODE
  ) {
    realNode = renderTextNode(realNode, newVNode);
  }

  // 要素の追加、削除、もしくは<div>から<span>等、要素の種類自体を変えた時の入れ替え処理
  else if (oldVNode === null || oldVNode.name !== newVNode.name) {
    const newRealNode = createRealNodeFromVNode(newVNode);
    if (newRealNode !== null) {
      parentNode.insertBefore(newRealNode, realNode);
    }
    if (oldVNode !== null && oldVNode.realNode !== null) {
      parentNode.removeChild(oldVNode.realNode);
    }
  }
};

export const render = (
  realNode: ElementAttachedNeedAttr,
  newVNode: VirtualNodeType
) => {
  if (realNode.parentElement !== null) {
    let oldVNode: VirtualNodeType | null;

    // realNodeごと追加・更新・削除の処理に入れる
    const vnodeFromRealElement = createVNodeFromRealElement(realNode);
    if (realNode.vdom === undefined) {
      oldVNode = { ...vnodeFromRealElement };
    } else {
      oldVNode = realNode.vdom;
    }

    vnodeFromRealElement.children = [newVNode];
    newVNode = vnodeFromRealElement;

    renderNode(realNode.parentElement, realNode, oldVNode, newVNode);
  } else {
    console.error(
      "Error! render func does not work, because the realNode does not have parentNode attribute."
    );
  }
};
