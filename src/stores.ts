import { derived, get, Writable, writable } from 'svelte/store';
import { buildGraph } from './graph';
import type Graph from 'graphology';
import type { Camera } from 'sigma';

type SettingsSize = 'in' | 'out';

export enum Mode {
  Navigate = 'Navigate',
  ShortestPath = 'Shortest Path',
  AdamicAdar = 'Adamic Adar',
  CoCitation = 'CoCitation',
}

interface Settings {
  size: SettingsSize;
  search?: string;
  pathA?: string;
  pathB?: string;
  gravity: number;
  mode: Mode;
  directed: boolean;
  bubbleSize: number;
  journal: boolean;
  filter: boolean;
  filterLength: number;
  cameraState?: ReturnType<Camera['getState']>;
  labelThreshold: number;
}

interface Store {
  uiVisible: boolean;
  graph?: Promise<Graph>;
}

function createStore() {
  const { subscribe, update } = writable<Store>({
    uiVisible: false
  });

  return {
    subscribe,
    visible: (visible: boolean) => {
      update((cur) => ({
        ...cur,
        uiVisible: visible
      }));
    },
    reload: () => {
      settings.update((settings) => {
        settings.cameraState = undefined;
        return settings;
      });

      update((cur) => ({
        ...cur,
        graph: buildGraph(
          () => logseq.Editor.getAllPages(),
          () =>
            logseq.DB.datascriptQuery(
              `[:find (pull ?b [*]) :in $ :where [?b :block/refs]]`
            ),
          (ref) => logseq.Editor.getBlock(ref),
          get(settings).journal
        )
      }));
    }
  };
}

export const store = createStore();
export const uiVisible = derived(store, (store) => store.uiVisible);
export const graph = derived(store, (store) => store.graph);

export const settings: Writable<Settings> = writable({
  size: 'in',
  gravity: 0.05,
  mode: Mode.Navigate,
  directed: true,
  bubbleSize: 5,
  journal: false,
  filter: false,
  filterLength: 3,
  labelThreshold: 1
});
