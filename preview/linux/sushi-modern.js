// SPDX-License-Identifier: GPL-3.0-or-later
// Sushi 51+ (GTK4 / WebKitGTK 6.0, stable plugin API 1).
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import WebKit from 'gi://WebKit?version=6.0';
import { Renderer } from 'resource://org/gnome/NautilusPreviewer/plugin-api-1.js';
// @@BRIDGE@@
export const Klass = class SlayDownRenderer extends WebKit.WebView {
    static { GObject.registerClass({ Implements: [Renderer] }, this); }
    constructor(file, _info, properties = {}) {
        const manager = new WebKit.UserContentManager();
        super({ ...properties, user_content_manager: manager });
        this._dispose = startBridge(this, manager, file, () => this.markReady(), error => {
            this.markFailed(new GLib.Error(Gio.io_error_quark(), Gio.IOErrorEnum.FAILED, error.message));
        }, () => this.get_root().close(), true);
    }
    cleanup() { this._dispose?.(); this._dispose = null; }
};
export const contentTypes = ['text/markdown', 'text/x-markdown'];
