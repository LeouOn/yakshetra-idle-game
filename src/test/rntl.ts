// Minimal React Native Testing Library shim.
//
// The real `@testing-library/react-native` cannot run under vitest 4: it
// transitively loads React Native's Flow-annotated source (`import typeof …`)
// which vitest's pipeline cannot parse, and no working recipe exists for
// RN 0.86 + React 19 + vitest 4. Rather than block every UI todo on that, this
// helper wraps `test-renderer` (the same renderer RNTL uses internally) with the
// small set of query/interaction primitives our component tests need. It renders
// against the `react-native` test shim, whose host components (`Text`, `View`,
// `Pressable`) become host elements that `testInstance.queryAll` can traverse.

import { createElement, act } from 'react';
import { createRoot, type Root, type TestInstance } from 'test-renderer';
type Predicate = (instance: TestInstance) => boolean;

interface RenderResult {
  readonly root: Root;
  readonly container: TestInstance;
  getByText(text: string): TestInstance;
  getByTextContent(substring: string): TestInstance;
  getByRole(role: string): TestInstance;
  getByLabelText(label: string): TestInstance;
  getByTestID(testID: string): TestInstance;
  queryByText(text: string): TestInstance | null;
  press(node: TestInstance): void;
  toJSON(): unknown;
}

function textContent(instance: TestInstance): string {
  let out = '';
  for (const child of instance.children) {
    if (typeof child === 'string') {
      out += child;
    } else {
      out += textContent(child);
    }
  }
  return out;
}

function findOne(instances: TestInstance[], describe: string): TestInstance {
  if (instances.length === 0) {
    throw new Error(`no element found for ${describe}`);
  }
  if (instances.length > 1) {
    throw new Error(`multiple elements (${instances.length}) found for ${describe}`);
  }
  return instances[0]!;
}

export function render(element: ReturnType<typeof createElement>): RenderResult {
  const root = createRoot();
  act(() => {
    root.render(element);
  });
  const container = root.container;

  const query = (predicate: Predicate): TestInstance[] =>
    container.queryAll(predicate as (instance: TestInstance) => boolean);

  return {
    root,
    container,
    getByText(text: string): TestInstance {
      return findOne(
        query((i) => i.type === 'Text' && i.children.length === 1 && i.children[0] === text),
        `text "${text}"`,
      );
    },
    getByTextContent(substring: string): TestInstance {
      return findOne(
        query((i) => i.type === 'Text' && textContent(i).includes(substring)),
        `text containing "${substring}"`,
      );
    },
    getByRole(role: string): TestInstance {
      return findOne(
        query((i) => i.props.accessibilityRole === role),
        `role "${role}"`,
      );
    },
    getByLabelText(label: string): TestInstance {
      return findOne(
        query((i) => i.props.accessibilityLabel === label),
        `label "${label}"`,
      );
    },
    getByTestID(testID: string): TestInstance {
      return findOne(
        query((i) => i.props.testID === testID),
        `testID "${testID}"`,
      );
    },
    queryByText(text: string): TestInstance | null {
      const hits = query(
        (i) => i.type === 'Text' && i.children.length === 1 && i.children[0] === text,
      );
      return hits.length === 1 ? hits[0]! : null;
    },
    press(node: TestInstance): void {
      const handler = node.props.onPress as (() => void) | undefined;
      if (typeof handler !== 'function') {
        throw new Error('element has no onPress handler');
      }
      act(() => {
        handler();
      });
    },
    toJSON(): unknown {
      return container.toJSON();
    },
  };
}

export { act };
