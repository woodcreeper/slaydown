// SPDX-License-Identifier: GPL-3.0-or-later
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.Wpf;
using Microsoft.Win32;
using QuickLook.Common.Plugin;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Web.Script.Serialization;
using System.Windows;
using System.Windows.Controls;

namespace QuickLook.Plugin.SlayDown
{
    public sealed class Plugin : IViewer
    {
        private WebView2 web;
        private ContextObject context;
        private string document;
        private string executable;
        private int generation;
        private readonly HashSet<Process> children = new HashSet<Process>();
        private readonly JavaScriptSerializer json = new JavaScriptSerializer { MaxJsonLength = 48 * 1024 * 1024 };
        private static readonly string SettingsDirectory = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "SlayDown", "QuickLook");
        public int Priority => 100;
        public void Init() { }
        public bool CanHandle(string path) => File.Exists(path) && new[] { ".md", ".markdown", ".mdown", ".mkd" }.Contains(Path.GetExtension(path).ToLowerInvariant());
        public void Prepare(string path, ContextObject value) { value.PreferredSize = new Size(1000, 740); }
        public async void View(string path, ContextObject value)
        {
            Cleanup(); context = value; document = path; var token = generation;
            context.Title = Path.GetFileName(path) + " — SlayDown";
            try
            {
                executable = FindExecutable();
                if (executable == null) { ShowSetup(); return; }
                await Load(token);
            }
            catch (Exception e) { if (generation == token) ShowError(e.Message); }
        }
        private static string FindExecutable()
        {
            var configuration = Path.Combine(SettingsDirectory, "executable.txt");
            if (File.Exists(configuration))
            {
                var selected = File.ReadAllText(configuration).Trim();
                if (Path.IsPathRooted(selected) && File.Exists(selected)) return selected;
            }
            foreach (var root in new[] { Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles) })
            {
                var candidate = Path.Combine(root, "SlayDown", "slaydown.exe");
                if (File.Exists(candidate)) return candidate;
            }
            return null;
        }
        private void ShowSetup()
        {
            var panel = new StackPanel { Margin = new Thickness(32) };
            panel.Children.Add(new TextBlock { Text = "Install SlayDown 0.3.0 or later, then choose slaydown.exe.", TextWrapping = TextWrapping.Wrap });
            var choose = new Button { Content = "Choose SlayDown…", Margin = new Thickness(0, 16, 0, 0) };
            choose.Click += async (_, __) => {
                var picker = new OpenFileDialog { Filter = "SlayDown|slaydown.exe", CheckFileExists = true };
                if (picker.ShowDialog() != true) return;
                executable = picker.FileName; var token = generation;
                try {
                    await Command(new[] { "--preview-appearance" });
                    if (generation != token) return;
                    Directory.CreateDirectory(SettingsDirectory);
                    File.WriteAllText(Path.Combine(SettingsDirectory, "executable.txt"), executable);
                    await Load(token);
                } catch (Exception e) { if (generation == token) ShowError(e.Message); }
            };
            panel.Children.Add(choose); context.ViewerContent = panel; context.IsBusy = false;
        }
        private void ShowError(string message)
        {
            context.ViewerContent = new TextBlock { Text = "SlayDown preview: " + message, Margin = new Thickness(32), TextWrapping = TextWrapping.Wrap };
            context.IsBusy = false;
        }
        private async Task Load(int token)
        {
            var html = await Command(new[] { "--preview-html", document });
            if (generation != token) return;
            // Serve from memory to avoid NavigateToString's 2 MiB ceiling and
            // avoid writing a document copy into the user's temporary folder.
            var uri = "https://preview.slaydown.invalid/" + Guid.NewGuid().ToString("N") + "/";
            var bytes = Encoding.UTF8.GetBytes(html);
            var view = new WebView2 { CreationProperties = new CoreWebView2CreationProperties { UserDataFolder = Path.Combine(SettingsDirectory, "WebView2") } };
            web = view; context.ViewerContent = view;
            await view.EnsureCoreWebView2Async();
            if (generation != token) return;
            view.CoreWebView2.Settings.AreDevToolsEnabled = false;
            view.CoreWebView2.Settings.AreDefaultContextMenusEnabled = false;
            view.CoreWebView2.NewWindowRequested += (_, e) => e.Handled = true;
            view.NavigationStarting += (_, e) => { if (e.Uri != uri) e.Cancel = true; };
            view.CoreWebView2.AddWebResourceRequestedFilter("*", CoreWebView2WebResourceContext.All);
            view.CoreWebView2.WebResourceRequested += (_, e) => {
                e.Response = e.Request.Uri == uri
                    ? view.CoreWebView2.Environment.CreateWebResourceResponse(new MemoryStream(bytes, false), 200, "OK", "Content-Type: text/html; charset=utf-8\r\nCache-Control: no-store")
                    : view.CoreWebView2.Environment.CreateWebResourceResponse(null, 403, "Blocked", "");
            };
            view.CoreWebView2.WebMessageReceived += async (_, e) => {
                // Ignore messages from any other origin, including frames.
                if (e.Source != uri) return;
                await Message(e.TryGetWebMessageAsString(), token);
            };
            view.NavigationCompleted += (_, e) => { if (generation == token) { context.IsBusy = false; if (!e.IsSuccess) ShowError("WebView could not load the preview."); } };
            view.Source = new Uri(uri);
        }
        private async Task Message(string raw, int token)
        {
            object id = null;
            try
            {
                if (raw.Length > 32768) throw new Exception("Preview message is too large.");
                var request = json.Deserialize<Dictionary<string, object>>(raw);
                id = request["id"]; if (!(id is int)) return;
                object result = null;
                switch (request["action"] as string)
                {
                    case "ready": break;
                    case "load": result = json.DeserializeObject(await Command(new[] { "--preview-appearance" })); break;
                    case "save": await Command(new[] { "--preview-save" }, json.Serialize(request["value"])); break;
                    case "image":
                        var relative = request["value"] as string;
                        if (relative == null || relative.Length > 8192) throw new Exception("Invalid image path.");
                        result = json.DeserializeObject(await Command(new[] { "--preview-image", document, relative })); break;
                    case "open": Process.Start(new ProcessStartInfo(executable, Quote(document)) { UseShellExecute = false }); break;
                    case "close": Window.GetWindow(web)?.Close(); return;
                    default: throw new Exception("Unsupported preview request.");
                }
                await Reply(id, result, null, token);
            }
            catch (Exception e) { if (id != null) await Reply(id, null, e.Message, token); }
        }
        private async Task Reply(object id, object result, string error, int token)
        {
            if (generation != token || web?.CoreWebView2 == null) return;
            try { await web.ExecuteScriptAsync("window.slaydownReply(" + json.Serialize(id) + "," + json.Serialize(result) + "," + json.Serialize(error) + ")"); }
            catch (Exception) { /* The user can dismiss the preview during a reply. */ }
        }
        private async Task<string> Command(string[] arguments, string input = null)
        {
            var process = new Process { StartInfo = new ProcessStartInfo(executable, string.Join(" ", arguments.Select(Quote))) {
                UseShellExecute = false, CreateNoWindow = true, RedirectStandardInput = true, RedirectStandardOutput = true, RedirectStandardError = true,
                StandardOutputEncoding = Encoding.UTF8, StandardErrorEncoding = Encoding.UTF8,
            } };
            process.Start(); children.Add(process);
            try {
                var output = process.StandardOutput.ReadToEndAsync(); var errors = process.StandardError.ReadToEndAsync();
                if (input != null) await process.StandardInput.WriteAsync(input);
                process.StandardInput.Close();
                var exit = Task.Run(() => process.WaitForExit(15000));
                if (!await exit) { process.Kill(); throw new Exception("SlayDown preview timed out."); }
                var text = await output; var error = await errors;
                if (process.ExitCode != 0) throw new Exception(error.Length > 0 ? error : "SlayDown 0.3.0 or later is required.");
                return text;
            } finally { children.Remove(process); process.Dispose(); }
        }
        // CommandLineToArgvW-compatible quoting; never invokes cmd.exe/PowerShell.
        internal static string Quote(string argument)
        {
            var result = new StringBuilder("\""); var slashes = 0;
            foreach (var c in argument) {
                if (c == '\\') { slashes++; continue; }
                result.Append('\\', c == '"' ? slashes * 2 + 1 : slashes); result.Append(c); slashes = 0;
            }
            return result.Append('\\', slashes * 2).Append('"').ToString();
        }
        public void Cleanup()
        {
            generation++;
            foreach (var child in children.ToArray()) { try { if (!child.HasExited) child.Kill(); } catch (Exception) { } }
            web?.Dispose(); web = null;
        }
    }
}
