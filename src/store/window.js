import { INITIAL_Z_INDEX, WINDOW_CONFIG } from "#constants";
import {create} from "zustand";
import {immer} from "zustand/middleware/immer";
import useTelemetryStore from "#store/telemetry.js";
const useWindowStore = create (

    immer((set) => ({
        windows: WINDOW_CONFIG,
        nextZIndex: INITIAL_Z_INDEX + 1,
        // Real timestamps (Activity Monitor's "Last focused" column) — kept
        // as a separate map rather than a field on each WINDOW_CONFIG entry
        // so the existing window-config shape stays untouched.
        lastFocusedAt: {},

        openWindow: (windowKey, data = null) => set((state) => {
            const win = state.windows[windowKey];
            if(!win) return;
            const isNewOpen = !win.isOpen;
            win.isOpen = true;
            win.isMinimized = false;
            win.zIndex = state.nextZIndex;
            win.data = data ?? win.data;
            state.nextZIndex++;
            state.lastFocusedAt[windowKey] = Date.now();
            if (isNewOpen) useTelemetryStore.getState().recordAppOpened();


        }),
        closeWindow: (windowKey) => set((state) => {
            const win = state.windows[windowKey];
            if(!win) return;
            win.isOpen = false;
            win.isMinimized = false;
            win.isMaximized = false;
            win.zIndex = INITIAL_Z_INDEX;
            win.data = null;


        }),
        focusWindow: (windowKey) => set((state) => {
            const win = state.windows[windowKey];
            if(!win) return;
            win.zIndex = state.nextZIndex++;
            state.lastFocusedAt[windowKey] = Date.now();
            useTelemetryStore.getState().recordFocusChange();

        }),
        minimizeWindow: (windowKey) => set((state) => {
            const win = state.windows[windowKey];
            if(!win) return;
            win.isMinimized = true;
        }),
        restoreWindow: (windowKey) => set((state) => {
            const win = state.windows[windowKey];
            if(!win) return;
            win.isMinimized = false;
            win.zIndex = state.nextZIndex++;
            state.lastFocusedAt[windowKey] = Date.now();
        }),
        toggleMaximize: (windowKey) => set((state) => {
            const win = state.windows[windowKey];
            if(!win) return;
            win.isMaximized = !win.isMaximized;
        }),


})),
);

export default useWindowStore;
