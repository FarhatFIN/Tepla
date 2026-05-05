using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Text.RegularExpressions;
using System.Windows.Forms;

namespace TeplaLauncher
{
    public class LauncherForm : Form
    {
        private Label repoLabel;
        private TextBox logBox;
        private string repoRoot;

        [STAThread]
        public static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new LauncherForm());
        }

        public LauncherForm()
        {
            Text = "Tepla Launcher";
            Width = 760;
            Height = 520;
            StartPosition = FormStartPosition.CenterScreen;
            MinimumSize = new Size(680, 460);

            var root = new TableLayoutPanel();
            root.Dock = DockStyle.Fill;
            root.Padding = new Padding(18);
            root.RowCount = 4;
            root.ColumnCount = 1;
            root.RowStyles.Add(new RowStyle(SizeType.Absolute, 78));
            root.RowStyles.Add(new RowStyle(SizeType.Absolute, 54));
            root.RowStyles.Add(new RowStyle(SizeType.Absolute, 166));
            root.RowStyles.Add(new RowStyle(SizeType.Percent, 100));
            Controls.Add(root);

            var title = new Label();
            title.Text = "Tepla Launcher";
            title.Font = new Font("Segoe UI", 22, FontStyle.Bold);
            title.Dock = DockStyle.Fill;
            title.TextAlign = ContentAlignment.MiddleLeft;
            root.Controls.Add(title, 0, 0);

            repoLabel = new Label();
            repoLabel.Dock = DockStyle.Fill;
            repoLabel.Font = new Font("Segoe UI", 10);
            repoLabel.TextAlign = ContentAlignment.MiddleLeft;
            root.Controls.Add(repoLabel, 0, 1);

            var buttons = new TableLayoutPanel();
            buttons.Dock = DockStyle.Fill;
            buttons.ColumnCount = 3;
            buttons.RowCount = 2;
            buttons.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 33.33f));
            buttons.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 33.33f));
            buttons.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 33.33f));
            buttons.RowStyles.Add(new RowStyle(SizeType.Percent, 50));
            buttons.RowStyles.Add(new RowStyle(SizeType.Percent, 50));
            root.Controls.Add(buttons, 0, 2);

            AddButton(buttons, "Start Docker Stack", 0, 0, delegate { RunStack("start"); });
            AddButton(buttons, "Stop Stack", 1, 0, delegate { RunStack("stop"); });
            AddButton(buttons, "Show Logs", 2, 0, delegate { RunStack("logs"); });
            AddButton(buttons, "Open Tepla", 0, 1, delegate { OpenUrl("http://localhost:3080"); });
            AddButton(buttons, "Gateway Health", 1, 1, delegate { OpenUrl("http://localhost:3000/health"); });
            AddButton(buttons, "Select Repo", 2, 1, delegate { SelectRepo(); });

            logBox = new TextBox();
            logBox.Dock = DockStyle.Fill;
            logBox.Multiline = true;
            logBox.ReadOnly = true;
            logBox.ScrollBars = ScrollBars.Vertical;
            logBox.Font = new Font("Consolas", 10);
            root.Controls.Add(logBox, 0, 3);

            repoRoot = ResolveRepoRoot();
            RefreshRepoLabel();
            WriteLog("Ready. Start Docker Desktop first, then click Start Docker Stack.");
            WriteLog("Cross-platform CLI: node scripts/dev/tepla-dev.mjs start");
        }

        private void AddButton(TableLayoutPanel panel, string text, int column, int row, EventHandler handler)
        {
            var button = new Button();
            button.Text = text;
            button.Dock = DockStyle.Fill;
            button.Margin = new Padding(6);
            button.Font = new Font("Segoe UI", 10, FontStyle.Bold);
            button.Click += handler;
            panel.Controls.Add(button, column, row);
        }

        private void RunStack(string action)
        {
            if (!EnsureRepoRoot())
            {
                return;
            }

            var scriptPath = Path.Combine(repoRoot, "scripts", "dev", "tepla-dev.mjs");
            if (!File.Exists(scriptPath))
            {
                MessageBox.Show("scripts/dev/tepla-dev.mjs was not found in the selected repository.", "Tepla Launcher", MessageBoxButtons.OK, MessageBoxIcon.Error);
                return;
            }

            WriteLog("Running: node scripts/dev/tepla-dev.mjs " + action);
            StartPowerShell("node scripts/dev/tepla-dev.mjs " + action);
        }

        private void StartPowerShell(string command)
        {
            var psCommand = "Set-Location -LiteralPath '" + repoRoot.Replace("'", "''") + "'; " + command;
            var startInfo = new ProcessStartInfo();
            startInfo.FileName = "powershell.exe";
            startInfo.Arguments = "-NoExit -NoProfile -ExecutionPolicy Bypass -Command \"" + psCommand.Replace("\"", "`\"") + "\"";
            startInfo.UseShellExecute = true;
            Process.Start(startInfo);
        }

        private void OpenUrl(string url)
        {
            try
            {
                Process.Start(url);
            }
            catch (Exception ex)
            {
                WriteLog("Open failed: " + ex.Message);
            }
        }

        private bool EnsureRepoRoot()
        {
            if (IsRepoRoot(repoRoot))
            {
                return true;
            }

            SelectRepo();
            return IsRepoRoot(repoRoot);
        }

        private void SelectRepo()
        {
            using (var dialog = new FolderBrowserDialog())
            {
                dialog.Description = "Select Tepla repository root";
                dialog.ShowNewFolderButton = false;

                if (dialog.ShowDialog(this) != DialogResult.OK)
                {
                    return;
                }

                if (!IsRepoRoot(dialog.SelectedPath))
                {
                    MessageBox.Show("Selected folder is not a Tepla repository root.", "Tepla Launcher", MessageBoxButtons.OK, MessageBoxIcon.Error);
                    return;
                }

                repoRoot = dialog.SelectedPath;
                SaveRepoRoot(repoRoot);
                RefreshRepoLabel();
                WriteLog("Repository selected: " + repoRoot);
            }
        }

        private string ResolveRepoRoot()
        {
            var saved = ReadSavedRepoRoot();
            if (IsRepoRoot(saved))
            {
                return saved;
            }

            var dir = AppDomain.CurrentDomain.BaseDirectory;
            while (!string.IsNullOrEmpty(dir))
            {
                if (IsRepoRoot(dir))
                {
                    return dir;
                }

                var parent = Directory.GetParent(dir);
                if (parent == null)
                {
                    break;
                }
                dir = parent.FullName;
            }

            return "";
        }

        private bool IsRepoRoot(string path)
        {
            if (string.IsNullOrEmpty(path) || !Directory.Exists(path))
            {
                return false;
            }

            return File.Exists(Path.Combine(path, "package.json"))
                && File.Exists(Path.Combine(path, "client", "package.json"))
                && File.Exists(Path.Combine(path, "infrastructure", "docker-compose.yml"));
        }

        private string StatePath()
        {
            var dir = Path.Combine(Path.GetTempPath(), "TeplaLauncher");
            if (!Directory.Exists(dir))
            {
                Directory.CreateDirectory(dir);
            }
            return Path.Combine(dir, "state.json");
        }

        private string ReadSavedRepoRoot()
        {
            try
            {
                var path = StatePath();
                if (!File.Exists(path))
                {
                    return "";
                }

                var raw = File.ReadAllText(path);
                var match = Regex.Match(raw, "\"repoRoot\"\\s*:\\s*\"(?<path>[^\"\\\\]*(?:\\\\.[^\"\\\\]*)*)\"");
                if (!match.Success)
                {
                    return "";
                }

                return Regex.Unescape(match.Groups["path"].Value);
            }
            catch
            {
                return "";
            }
        }

        private void SaveRepoRoot(string path)
        {
            var escaped = path.Replace("\\", "\\\\").Replace("\"", "\\\"");
            File.WriteAllText(StatePath(), "{\"repoRoot\":\"" + escaped + "\"}");
        }

        private void RefreshRepoLabel()
        {
            repoLabel.Text = IsRepoRoot(repoRoot)
                ? "Repository: " + repoRoot
                : "Repository: not selected";
        }

        private void WriteLog(string message)
        {
            logBox.AppendText("[" + DateTime.Now.ToString("HH:mm:ss") + "] " + message + Environment.NewLine);
        }
    }
}
