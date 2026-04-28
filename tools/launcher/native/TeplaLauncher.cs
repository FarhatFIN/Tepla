using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Linq;
using System.Windows.Forms;

namespace TeplaLauncher
{
    static class Program
    {
        [STAThread]
        static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new LauncherForm());
        }
    }

    sealed class ServiceDef
    {
        public string Id, Name, Command, Port;
        public Dictionary<string, string> Env = new Dictionary<string, string>();
    }

    sealed class LauncherForm : Form
    {
        readonly string stateDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "TeplaLauncher");
        readonly string stateFile;
        readonly Dictionary<string, int> pids = new Dictionary<string, int>();
        readonly List<ServiceDef> services = new List<ServiceDef>();
        readonly Dictionary<string, string> sharedEnv = new Dictionary<string, string>();
        readonly ListView list = new ListView();
        readonly Label repoLabel = new Label();
        readonly TextBox logBox = new TextBox();
        readonly Timer timer = new Timer();
        string repoRoot;

        public LauncherForm()
        {
            stateFile = Path.Combine(stateDir, "state.ini");
            InitData();
            LoadState();
            repoRoot = ResolveRepoRoot();
            InitializeUi();
            RefreshStatus();
            timer.Interval = 3000;
            timer.Tick += delegate { RefreshStatus(); };
            timer.Start();
        }

        void InitData()
        {
            sharedEnv["NODE_ENV"] = "development";
            sharedEnv["DATABASE_URL"] = "postgresql://tepla:tepla_secret@localhost:5432/tepla";
            sharedEnv["REDIS_URL"] = "redis://localhost:6379";
            sharedEnv["REDIS_CACHE_URL"] = "redis://localhost:6379";
            sharedEnv["REDIS_PERSIST_URL"] = "redis://localhost:6379";
            sharedEnv["KAFKA_BROKERS"] = "localhost:9092";
            sharedEnv["ELASTICSEARCH_URL"] = "http://localhost:9200";
            sharedEnv["JWT_SECRET"] = "tepla-jwt-secret-change-me";
            sharedEnv["CORS_ORIGIN"] = "*";
            sharedEnv["S3_ENDPOINT"] = "http://localhost:9000";
            sharedEnv["S3_REGION"] = "us-east-1";
            sharedEnv["S3_ACCESS_KEY"] = "tepla_minio";
            sharedEnv["S3_SECRET_KEY"] = "tepla_minio_secret";
            sharedEnv["S3_BUCKET"] = "tepla-media";
            AddService("gateway", "API Gateway", "3000", "npm.cmd run dev:gateway", new Dictionary<string,string> { {"PORT","3000"}, {"AUTH_USER_SERVICE_URL","http://localhost:3001"}, {"MESSAGING_SERVICE_URL","http://localhost:3003"}, {"MEDIA_SERVICE_URL","http://localhost:3007"}, {"REALTIME_SERVICE_URL","http://localhost:3100"}, {"BOT_PLATFORM_SERVICE_URL","http://localhost:3013"}, {"TEPLA_ENABLE_BOT_PLATFORM","true"}, {"TEPLA_ENABLE_LEGACY_FEATURES","false"} });
            AddService("auth-user", "Auth/User Service", "3001", "npm.cmd run dev:auth-user", new Dictionary<string,string>{{"PORT","3001"}});
            AddService("messaging", "Messaging Service", "3003", "npm.cmd run dev:messaging", new Dictionary<string,string>{{"PORT","3003"}});
            AddService("media", "Media Service", "3007", "npm.cmd run dev:media", new Dictionary<string,string>{{"PORT","3007"},{"S3_ENDPOINT","http://localhost:9000"},{"S3_REGION","us-east-1"},{"S3_ACCESS_KEY","tepla_minio"},{"S3_SECRET_KEY","tepla_minio_secret"},{"S3_BUCKET","tepla-media"}});
            AddService("realtime", "Realtime Service", "3100", "npm.cmd run dev:realtime", new Dictionary<string,string>{{"PORT","3100"}});
            AddService("bot-platform", "Bot Platform", "3013", "npm.cmd run dev:bot", new Dictionary<string,string>{{"PORT","3013"}});
            AddService("client", "Tepla Client UI", "3080", "npm.cmd run dev", new Dictionary<string,string>{{"NEXT_PUBLIC_API_URL","http://localhost:3000/api/v2"}});
        }

        void AddService(string id, string name, string port, string command, Dictionary<string,string> env)
        {
            ServiceDef s = new ServiceDef(); s.Id = id; s.Name = name; s.Port = port; s.Command = command; s.Env = env; services.Add(s);
        }

        void InitializeUi()
        {
            Text = "Tepla Launcher";
            StartPosition = FormStartPosition.CenterScreen;
            MinimumSize = new Size(980, 680);
            Size = new Size(1060, 720);
            BackColor = Color.FromArgb(7, 17, 31);
            ForeColor = Color.White;
            Font = new Font("Segoe UI", 9F);
            Panel top = new Panel { Dock = DockStyle.Top, Height = 148, BackColor = Color.FromArgb(13, 31, 54), Padding = new Padding(18) };
            Controls.Add(top);
            Label title = new Label { Text = "Tepla Launcher", Font = new Font("Segoe UI", 21F, FontStyle.Bold), AutoSize = true, Location = new Point(18, 16) };
            top.Controls.Add(title);
            Label sub = new Label { Text = "Native Windows launcher for infrastructure, backend services, client UI, and bot platform.", ForeColor = Color.FromArgb(170, 192, 220), AutoSize = true, Location = new Point(22, 57) };
            top.Controls.Add(sub);
            repoLabel.AutoSize = false; repoLabel.Location = new Point(22, 92); repoLabel.Size = new Size(980, 22); repoLabel.ForeColor = Color.FromArgb(215, 232, 251);
            top.Controls.Add(repoLabel);
            FlowLayoutPanel buttons = new FlowLayoutPanel { Dock = DockStyle.Top, Height = 48, Padding = new Padding(16, 8, 16, 4), BackColor = Color.FromArgb(9, 23, 41) };
            Controls.Add(buttons);
            AddButton(buttons, "Select Repo", delegate { SelectRepo(); });
            AddButton(buttons, "Start All", delegate { StartInfra(); StartCore(); StartService("client"); });
            AddButton(buttons, "Start Infra", delegate { StartInfra(); });
            AddButton(buttons, "Start Core", delegate { StartCore(); });
            AddButton(buttons, "Start Client UI", delegate { StartService("client"); });
            AddButton(buttons, "Start Bot", delegate { StartService("bot-platform"); });
            AddButton(buttons, "Open UI", delegate { OpenUrl("http://localhost:3080"); });
            AddButton(buttons, "Health", delegate { OpenUrl("http://localhost:3000/health"); });
            AddButton(buttons, "Stop All", delegate { StopAll(); });
            logBox.Dock = DockStyle.Bottom; logBox.Height = 120; logBox.Multiline = true; logBox.ScrollBars = ScrollBars.Vertical; logBox.ReadOnly = true; logBox.BackColor = Color.FromArgb(5, 11, 20); logBox.ForeColor = Color.FromArgb(160, 181, 209); logBox.Font = new Font("Consolas", 9F);
            Controls.Add(logBox);
            list.Dock = DockStyle.Fill; list.View = View.Details; list.FullRowSelect = true; list.GridLines = true; list.BackColor = Color.FromArgb(12, 26, 44); list.ForeColor = Color.White;
            list.Columns.Add("Service", 220); list.Columns.Add("Port", 70); list.Columns.Add("Status", 120); list.Columns.Add("PID", 80); list.Columns.Add("Command", 420);
            list.DoubleClick += delegate { if (list.SelectedItems.Count > 0) StartService(list.SelectedItems[0].Tag.ToString()); };
            Controls.Add(list);
            ContextMenuStrip menu = new ContextMenuStrip();
            menu.Items.Add("Start", null, delegate { SelectedService(delegate(string id) { StartService(id); }); });
            menu.Items.Add("Stop", null, delegate { SelectedService(delegate(string id) { StopService(id); }); });
            list.ContextMenuStrip = menu;
        }

        void AddButton(FlowLayoutPanel panel, string text, EventHandler action)
        {
            Button b = new Button { Text = text, AutoSize = true, Height = 30, FlatStyle = FlatStyle.Flat, BackColor = Color.FromArgb(25, 49, 80), ForeColor = Color.White, Margin = new Padding(4) };
            b.FlatAppearance.BorderColor = Color.FromArgb(47, 78, 112); b.Click += action; panel.Controls.Add(b);
        }

        void SelectedService(Action<string> action) { if (list.SelectedItems.Count > 0) action(list.SelectedItems[0].Tag.ToString()); }

        void SelectRepo()
        {
            using (FolderBrowserDialog d = new FolderBrowserDialog())
            {
                d.Description = "Select Tepla repository root"; d.ShowNewFolderButton = false;
                if (d.ShowDialog(this) == DialogResult.OK)
                {
                    if (!IsRepoRoot(d.SelectedPath)) { MessageBox.Show(this, "Selected folder is not Tepla repo root.", "Tepla Launcher"); return; }
                    repoRoot = d.SelectedPath; SaveState(); RefreshStatus(); Log("Repo selected: " + repoRoot);
                }
            }
        }

        string ResolveRepoRoot()
        {
            if (IsRepoRoot(repoRoot)) return repoRoot;
            string baseDir = AppDomain.CurrentDomain.BaseDirectory;
            string[] candidates = new string[] { baseDir, Directory.GetCurrentDirectory(), Path.GetFullPath(Path.Combine(baseDir, "..\\..")), @"C:\Users\user\.codex\worktrees\fc5a\tepla", @"C:\Users\user\Desktop\tepla" };
            foreach (string c in candidates) if (IsRepoRoot(c)) return Path.GetFullPath(c);
            return repoRoot;
        }

        bool IsRepoRoot(string path)
        {
            return !String.IsNullOrEmpty(path) && File.Exists(Path.Combine(path, "package.json")) && File.Exists(Path.Combine(path, "client", "package.json")) && File.Exists(Path.Combine(path, "infrastructure", "docker-compose.yml"));
        }

        void StartCore() { foreach (string id in new string[] { "gateway", "auth-user", "messaging", "media", "realtime" }) StartService(id); }

        void StartService(string id)
        {
            repoRoot = ResolveRepoRoot();
            if (!IsRepoRoot(repoRoot)) { SelectRepo(); if (!IsRepoRoot(repoRoot)) return; }
            ServiceDef s = services.First(x => x.Id == id);
            if (IsRunning(id)) { Log(s.Name + " already running"); return; }
            string cmd = "$host.UI.RawUI.WindowTitle='Tepla - " + EscapePs(s.Name) + "'; " + BuildEnvScript(s) + " Set-Location '" + EscapePs(repoRoot) + "'; " + s.Command;
            ProcessStartInfo psi = new ProcessStartInfo("powershell.exe", "-NoExit -ExecutionPolicy Bypass -Command \"" + cmd.Replace("\"", "`\"") + "\"");
            psi.WorkingDirectory = repoRoot; psi.UseShellExecute = true;
            Process p = Process.Start(psi); pids[id] = p.Id; SaveState(); RefreshStatus(); Log("Started " + s.Name + " PID " + p.Id);
        }

        string BuildEnvScript(ServiceDef s)
        {
            Dictionary<string,string> env = new Dictionary<string,string>(sharedEnv);
            foreach (var kv in s.Env) env[kv.Key] = kv.Value;
            List<string> parts = new List<string>();
            foreach (var kv in env) parts.Add("$env:" + kv.Key + "='" + EscapePs(kv.Value) + "';");
            return String.Join(" ", parts.ToArray());
        }

        void StartInfra()
        {
            repoRoot = ResolveRepoRoot();
            if (!IsRepoRoot(repoRoot)) { SelectRepo(); if (!IsRepoRoot(repoRoot)) return; }
            string cmd = "$host.UI.RawUI.WindowTitle='Tepla - Infra'; Set-Location '" + EscapePs(repoRoot) + "'; docker compose -f infrastructure/docker-compose.yml -f infrastructure/docker-compose.dev.yml up -d";
            Process.Start(new ProcessStartInfo("powershell.exe", "-NoExit -ExecutionPolicy Bypass -Command \"" + cmd.Replace("\"", "`\"") + "\"") { WorkingDirectory = repoRoot, UseShellExecute = true });
            Log("Infra start command opened");
        }

        void StopService(string id)
        {
            if (!pids.ContainsKey(id)) return;
            try { Process tk = Process.Start(new ProcessStartInfo("taskkill.exe", "/PID " + pids[id] + " /T /F") { CreateNoWindow = true, UseShellExecute = false }); if (tk != null) tk.WaitForExit(8000); } catch { }
            pids.Remove(id); SaveState(); RefreshStatus(); Log("Stopped " + id);
        }

        void StopAll()
        {
            foreach (string id in services.Select(s => s.Id).ToArray()) StopService(id);
            if (IsRepoRoot(repoRoot)) Process.Start(new ProcessStartInfo("powershell.exe", "-ExecutionPolicy Bypass -Command \"Set-Location '" + EscapePs(repoRoot) + "'; docker compose -f infrastructure/docker-compose.yml -f infrastructure/docker-compose.dev.yml down\"") { WorkingDirectory = repoRoot, UseShellExecute = true });
        }

        bool IsRunning(string id) { if (!pids.ContainsKey(id)) return false; try { Process.GetProcessById(pids[id]); return true; } catch { return false; } }

        void RefreshStatus()
        {
            repoLabel.Text = "Repo: " + (IsRepoRoot(repoRoot) ? repoRoot : "not selected");
            list.BeginUpdate(); list.Items.Clear();
            foreach (ServiceDef s in services)
            {
                bool running = IsRunning(s.Id);
                ListViewItem item = new ListViewItem(s.Name); item.Tag = s.Id;
                item.SubItems.Add(s.Port); item.SubItems.Add(running ? "RUNNING" : "stopped"); item.SubItems.Add(running ? pids[s.Id].ToString() : ""); item.SubItems.Add(s.Command);
                item.BackColor = running ? Color.FromArgb(16, 64, 45) : Color.FromArgb(12, 26, 44); item.ForeColor = Color.White;
                list.Items.Add(item);
            }
            list.EndUpdate();
        }

        void OpenUrl(string url) { Process.Start(new ProcessStartInfo(url) { UseShellExecute = true }); }
        string EscapePs(string value) { return (value ?? "").Replace("'", "''"); }
        void Log(string text) { logBox.Text = DateTime.Now.ToString("HH:mm:ss") + "  " + text + Environment.NewLine + logBox.Text; }
        void LoadState()
        {
            if (!File.Exists(stateFile)) return;
            foreach (string line in File.ReadAllLines(stateFile))
            {
                int eq = line.IndexOf('='); if (eq < 0) continue;
                string k = line.Substring(0, eq), v = line.Substring(eq + 1);
                if (k == "repoRoot") repoRoot = v;
                else if (k.StartsWith("pid.")) { int pid; if (Int32.TryParse(v, out pid)) pids[k.Substring(4)] = pid; }
            }
        }
        void SaveState()
        {
            Directory.CreateDirectory(stateDir);
            List<string> lines = new List<string>(); lines.Add("repoRoot=" + (repoRoot ?? ""));
            foreach (var kv in pids) lines.Add("pid." + kv.Key + "=" + kv.Value);
            File.WriteAllLines(stateFile, lines.ToArray());
        }
    }
}