// SPDX-License-Identifier: GPL-3.0-or-later
// Sushi 46–50 (GTK3 / WebKitGTK 4.1).
const { Gio, GLib, GObject } = imports.gi;
imports.gi.versions.WebKit2 = '4.1';
const WebKit = imports.gi.WebKit2;
const Renderer = imports.ui.renderer;
// @@BRIDGE@@
var Klass = GObject.registerClass({
    Implements: [Renderer.Renderer],
    Properties: {
        fullscreen: GObject.ParamSpec.boolean('fullscreen', '', '', GObject.ParamFlags.READABLE, false),
        ready: GObject.ParamSpec.boolean('ready', '', '', GObject.ParamFlags.READABLE, false),
    },
}, class SlayDownRenderer extends WebKit.WebView {
    _init(file) {
        const manager = new WebKit.UserContentManager();
        super._init({ user_content_manager: manager });
        const dispose = startBridge(this, manager, file, () => this.isReady(), error => {
            this.emit('error', new GLib.Error(Gio.io_error_quark(), Gio.IOErrorEnum.FAILED, error.message));
        }, () => this.get_toplevel().close());
        this.connect('destroy', dispose);
    }
    get ready() { return !!this._ready; }
    get fullscreen() { return false; }
    get moveOnClick() { return false; }
});
var mimeTypes = ['text/markdown', 'text/x-markdown'];
