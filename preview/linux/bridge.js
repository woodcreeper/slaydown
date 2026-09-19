// SPDX-License-Identifier: GPL-3.0-or-later
// Included in both Sushi API adapters by build-linux.mjs.
const BINARY = '@@SLAYDOWN_BINARY@@';
function startBridge(view, manager, file, ready, fail, close, modern = false) {
    let alive = true;
    const children = new Set();
    const path = file.get_path();
    function command(args, input = null) {
        return new Promise((resolve, reject) => {
            if (!alive) { reject(new Error('Preview closed.')); return; }
            const flags = Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE | Gio.SubprocessFlags.STDIN_PIPE;
            let child;
            try { child = Gio.Subprocess.new([BINARY, ...args], flags); }
            catch (error) { reject(error); return; }
            children.add(child);
            child.communicate_utf8_async(input, null, (process, result) => {
                children.delete(child);
                try {
                    const [, stdout, stderr] = process.communicate_utf8_finish(result);
                    if (!process.get_successful()) throw new Error(stderr || 'SlayDown could not load this preview.');
                    resolve(stdout);
                } catch (error) { reject(error); }
            });
        });
    }
    async function message(raw) {
        let request;
        try {
            if (raw.length > 32768) throw new Error('Preview message is too large.');
            request = JSON.parse(raw);
            if (!Number.isSafeInteger(request.id)) return;
            let value = null;
            switch (request.action) {
            case 'ready': log('SlayDown preview rendered'); break;
            case 'load': value = JSON.parse(await command(['--preview-appearance'])); break;
            case 'save': await command(['--preview-save'], JSON.stringify(request.value)); break;
            case 'image':
                if (typeof request.value !== 'string' || request.value.length > 8192) throw new Error('Invalid image path.');
                value = JSON.parse(await command(['--preview-image', path, request.value])); break;
            case 'open': Gio.Subprocess.new([BINARY, path], Gio.SubprocessFlags.NONE); break;
            case 'close': close(); return;
            default: throw new Error('Unsupported preview request.');
            }
            reply(request.id, value, null);
        } catch (error) { if (request) reply(request.id, null, error.message); }
    }
    function reply(id, value, error) {
        if (!alive) return;
        const code = `window.slaydownReply(${JSON.stringify(id)},${JSON.stringify(value)},${JSON.stringify(error)})`;
        if (view.evaluate_javascript) view.evaluate_javascript(code, -1, null, null, null, null);
        else view.run_javascript(code, null, null);
    }
    if (modern) manager.register_script_message_handler('slaydown', null);
    else manager.register_script_message_handler('slaydown');
    const handler = manager.connect('script-message-received::slaydown', (_manager, result) => {
        const value = result.get_js_value ? result.get_js_value() : result;
        void message(value.to_string());
    });
    view.connect('context-menu', () => true);
    view.connect('decide-policy', (_view, decision, type) => {
        if (type === 0 || type === 1) { // navigation/new window
            const uri = decision.get_navigation_action().get_request().get_uri();
            if (uri !== 'about:blank') { decision.ignore(); return true; }
        }
        return false;
    });
    if (!path) fail(new Error('Only local Markdown files can be previewed.'));
    else command(['--preview-html', path]).then(html => {
        if (alive) { view.load_html(html, 'about:blank'); ready(); }
    }).catch(error => { if (alive) fail(error); });
    return () => {
        alive = false;
        manager.disconnect(handler);
        if (modern) manager.unregister_script_message_handler('slaydown', null);
        else manager.unregister_script_message_handler('slaydown');
        for (const child of children) child.force_exit();
        children.clear();
    };
}
