import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { View, Text } from 'react-native';

import IndexScreen from '../../../app/index';
import { act, render } from '@/test/rntl';
import { resolveSid } from '@/i18n';
import type { SaveBlob } from '@/engine/types';
import type { SaveSlotError, UseSaveSlotResult } from '@/ui/hooks/useSaveSlot';

// Hoisted by vitest above every import: app/index pulls expo-router, whose
// Flow-typed source cannot parse under vitest (the rntl shim's problem class).
vi.mock('expo-router', () => ({
  router: { push: vi.fn(), replace: vi.fn() },
}));

// The route uses expo-router's router; the test shim maps pushes to a no-op.
// useSaveSlot is mocked so the home hierarchy (resume vs fresh) is testable
// without a real adapter — persistence itself is covered by useSaveSlot's
// own suite.

type SlotState = Partial<UseSaveSlotResult>;

let slot: SlotState = {};

vi.mock('@/ui/hooks/useSaveSlot', () => ({
  useSaveSlot: (): SlotState => slot,
}));

function blobWithLife(alive: boolean): SaveBlob {
  return {
    schema_version: '0.1',
    engine_compat: 'test',
    created_at_unix: 0,
    run_id: 'run-1',
    chain: {
      life_states: [
        {
          id: 'life-1',
          alive,
          era: 'tang-china@0.1.0',
          role: 'peasant@0.1.0',
          chosen_lens: 'generosity',
        } as never,
      ],
      karma_state: { echoes: [] } as never,
      current_life_index: 0,
    },
  };
}

/** Render and let the hydration-safe mounted flag flip (one microtask). */
async function mount() {
  const ui = render(createElement(IndexScreen));
  await act(async () => {
    await Promise.resolve();
  });
  return ui;
}

describe('home screen (wave 2b)', () => {
  it('shows one primary action first: Go work a day', async () => {
    slot = {
      settings: disclaimerOn(),
      updateSettings: () => undefined,
      state: null,
      loading: false,
      error: null,
      clearError: () => undefined,
    };
    const ui = await mount();
    const primary = ui.getByText(resolveSid('home.new_life_button_sid'));
    expect(primary).toBeDefined();
    // No resume affordance without a save.
    expect(ui.queryByText(resolveSid('home.continue_button_sid'))).toBeNull();
    const line = ui.container.queryAll((n) => n.props.testID === 'home-resume-line');
    expect(line).toHaveLength(0);
    void primary;
  });

  it('Back to work appears only when a live save exists, and says what it resumes', async () => {
    slot = {
      settings: disclaimerOn(),
      updateSettings: () => undefined,
      state: blobWithLife(true),
      loading: false,
      error: null,
      clearError: () => undefined,
    };
    const ui = await mount();
    expect(ui.getByText(resolveSid('home.continue_button_sid'))).toBeDefined();
    const line = ui.getByTestID('home-resume-line').children[0];
    expect(String(line)).toContain('tang-china');
    expect(String(line)).toContain('peasant');
    expect(String(line)).toContain(resolveSid('lens.generosity_sid'));
  });

  it('a finished life is not resumable', async () => {
    slot = {
      settings: disclaimerOn(),
      updateSettings: () => undefined,
      state: blobWithLife(false),
      loading: false,
      error: null,
      clearError: () => undefined,
    };
    const ui = await mount();
    expect(ui.queryByText(resolveSid('home.continue_button_sid'))).toBeNull();
  });

  it('the studio button is named for what it is, with one quiet line', async () => {
    slot = {
      settings: disclaimerOn(),
      updateSettings: () => undefined,
      state: null,
      loading: false,
      error: null,
      clearError: () => undefined,
    };
    const ui = await mount();
    expect(ui.getByText(resolveSid('studio.home_button_sid')).children[0]).toBe('The workshop');
    expect(ui.getByText(resolveSid('studio.home_button_hint_sid'))).toBeDefined();
  });

  it('a failed load surfaces the error bar, and Go on dismisses it', async () => {
    const error: SaveSlotError = { operation: 'load', message: 'save slot load failed: boom' };
    const clear = vi.fn();
    slot = {
      settings: disclaimerOn(),
      updateSettings: () => undefined,
      state: null,
      loading: false,
      error,
      clearError: clear,
    };
    const ui = await mount();
    expect(ui.getByTestID('save-error-bar')).toBeDefined();
    expect(ui.getByText(resolveSid('save_error.load_sid'))).toBeDefined();
    ui.press(ui.getByTestID('save-error-continue'));
    expect(clear).toHaveBeenCalledTimes(1);
  });
});

function disclaimerOn() {
  return {
    contentWarnings: {},
    reducedMotion: false,
    fontScale: 'medium',
    disclaimerAccepted: true,
  } as never;
}

// Keep the RN imports referenced (the shim maps them to host elements).
void View;
void Text;
