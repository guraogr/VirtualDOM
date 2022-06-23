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

const renderNode = (
  parentNode: HTMLElement,
  realNode: VirtualNodeType["realNode"],
  oldVNode: VirtualNodeType | null,
  newVNode: VirtualNodeType
) => {};

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
