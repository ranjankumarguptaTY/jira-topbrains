import React, { useState } from "react";
import {
  Lock,
  Mail,
  User,
  Shield,
  ArrowRight,
  Sparkles,
  Info,
  MessageSquare,
  FolderKanban,
  Zap,
  CheckCircle2,
  Users,
  Radio,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useModal } from "../../context/ModalContext";
import { TopBrainsLogo } from "../common/TopBrainsLogo";
import { Avatar } from "../common/Avatar";
import "./AuthPage.css";

const DEMO_ACCOUNTS = [
  {
    name: "Super Admin",
    email: "admin@sprintr.com",
    role: "Platform Super Administrator",
    avatar:
      "https://api.dicebear.com/7.x/bottts/svg?seed=SprintrMasterSuperAdmin",
    badgeColor: "#6554C0",
    isAdmin: true,
  },
  {
    name: "Sarah Connor",
    email: "sarah.admin@sprintr.com",
    role: "Org Admin (Sprintr Tech Org)",
    avatar:
      "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80",
    badgeColor: "#DE350B",
  },
  {
    name: "Bruce Wayne",
    email: "bruce.wayne@waynecorp.com",
    role: "Org Admin (Wayne Enterprises)",
    avatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    badgeColor: "#DE350B",
  },
  {
    name: "Alex Morgan",
    email: "alex.lead@sprintr.com",
    role: "Team Lead (Core Engineering)",
    avatar:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    badgeColor: "#006644",
  },
  {
    name: "John Developer",
    email: "dev.john@sprintr.com",
    role: "Software Engineer",
    avatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
    badgeColor: "#0052CC",
  },
  {
    name: "Tony Tester",
    email: "qa.tony@sprintr.com",
    role: "QA / Tester",
    avatar:
      "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80",
    badgeColor: "#403294",
  },
  {
    name: "Jordan Guest",
    email: "external.guest@gmail.com",
    role: "External Guest (1:1 Chat)",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=JordanGuest",
    badgeColor: "#7A869A",
  },
];

export const AuthPage = () => {
  const { login, register } = useAuth();
  const { showToast } = useModal();

  const [mode, setMode] = useState("login"); // 'login' | 'register'
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDemoAccounts, setShowDemoAccounts] = useState(false);

  const handleQuickDemoLogin = async (demo) => {
    setEmail(demo.email);
    const pwd =
      demo.email === "admin@topbrains.com" ? "adminpassword123" : "password123";
    setPassword(pwd);
    try {
      setIsSubmitting(true);
      await login(demo.email, pwd);
      showToast({ message: `Welcome back, ${demo.name}!`, type: "success" });
    } catch (err) {
      showToast({
        message: "Login failed: " + (err.response?.data?.detail || err.message),
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) return;

    try {
      setIsSubmitting(true);
      const user = await login(email.trim(), password);
      showToast({ message: `Logged in as ${user.name}`, type: "success" });
    } catch (err) {
      showToast({
        message: err.response?.data?.detail || "Invalid email or password",
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) return;

    try {
      setIsSubmitting(true);
      const user = await register({
        name: name.trim(),
        company_name: companyName.trim(),
        email: email.trim(),
        password,
      });
      showToast({
        message: `Account created! Welcome, ${user.name}`,
        type: "success",
      });
    } catch (err) {
      showToast({
        message: err.response?.data?.detail || "Registration failed",
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-showcase-container">
        {/* Left Side: Brand Showcase & Features */}
        <div className="auth-side-panel">
          <div className="auth-side-brand">
            <TopBrainsLogo size={42} showText={true} />
            <p className="auth-side-subtitle">
              Enterprise Collaboration & Agile Project Management Platform
            </p>
          </div>

          <div className="auth-feature-list">
            <div className="auth-feature-item">
              <div className="auth-feature-icon" style={{ background: '#DEEBFF', color: '#0052CC' }}>
                <MessageSquare size={20} />
              </div>
              <div className="auth-feature-text">
                <h3>Real-Time Team Channels & DMs</h3>
                <p>Collaborate in tenant-scoped channels, project chats, or cross-workspace guest conversations.</p>
              </div>
            </div>

            <div className="auth-feature-item">
              <div className="auth-feature-icon" style={{ background: '#E3FCEF', color: '#00875A' }}>
                <FolderKanban size={20} />
              </div>
              <div className="auth-feature-text">
                <h3>Interactive Kanban Boards & Sprints</h3>
                <p>Manage backlog items, track sprint progress, and drag-and-drop tickets across custom workflow states.</p>
              </div>
            </div>

            <div className="auth-feature-item">
              <div className="auth-feature-icon" style={{ background: '#EAE6FF', color: '#6554C0' }}>
                <Radio size={20} />
              </div>
              <div className="auth-feature-text">
                <h3>Cross-Tenant Announcements</h3>
                <p>Publish broadcasts and platform-wide notices automated delivery.</p>
              </div>
            </div>

            <div className="auth-feature-item">
              <div className="auth-feature-icon" style={{ background: '#FFEBE6', color: '#DE350B' }}>
                <Shield size={20} />
              </div>
              <div className="auth-feature-text">
                <h3>Multi-Tier Role Isolation</h3>
                <p>Fine-grained permissions for Org Admins, Team Leads, Members, and External Guests.</p>
              </div>
            </div>
          </div>

          <div className="auth-side-footer">
            <div className="auth-side-stat">
              <span className="auth-side-stat-val">100%</span>
              <span className="auth-side-stat-lbl">Secure & Isolated</span>
            </div>
            <div className="auth-side-stat-sep" />
            <div className="auth-side-stat">
              <span className="auth-side-stat-val">Live</span>
              <span className="auth-side-stat-lbl">WebSocket Sync</span>
            </div>
            <div className="auth-side-stat-sep" />
            <div className="auth-side-stat">
              <span className="auth-side-stat-val">Zero</span>
              <span className="auth-side-stat-lbl">Config Setup</span>
            </div>
          </div>
        </div>

        {/* Right Side: Auth Form Container */}
        <div className="auth-main-panel">
          <div className="auth-card">
            {/* Mode Switch Tabs */}
            <div className="auth-tabs">
              <button
                type="button"
                onClick={() => setMode("login")}
                className={`auth-tab-btn ${mode === "login" ? "active" : ""}`}
              >
                Log in
              </button>
              <button
                type="button"
                onClick={() => setMode("register")}
                className={`auth-tab-btn ${mode === "register" ? "active" : ""}`}
              >
                Create account
              </button>
            </div>

            {/* Login Form */}
            {mode === "login" ? (
              <form onSubmit={handleLoginSubmit} className="auth-form-body">
                <div className="auth-title-block">
                  <h2 className="auth-title">Welcome back</h2>
                  <p className="auth-subtitle">
                    Sign in to your collaboration workspace to access chat and projects.
                  </p>
                </div>

                <div className="auth-form-fields">
                  <div className="auth-input-group">
                    <label className="auth-input-label">Work Email</label>
                    <div className="auth-input-wrapper">
                      <Mail size={16} className="auth-input-icon" />
                      <input
                        type="email"
                        placeholder="name@topbrains.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="auth-input"
                        required
                      />
                    </div>
                  </div>

                  <div className="auth-input-group">
                    <label className="auth-input-label">Password</label>
                    <div className="auth-input-wrapper">
                      <Lock size={16} className="auth-input-icon" />
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="auth-input"
                        style={{ paddingRight: "40px" }}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{
                          position: "absolute",
                          right: "12px",
                          background: "transparent",
                          border: "none",
                          cursor: "pointer",
                          color: "#7A869A",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: 0,
                        }}
                        title={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting || !email || !password}
                    className="btn btn-primary auth-submit-btn"
                  >
                    {isSubmitting ? "Signing in..." : "Sign In"}
                  </button>
                </div>

                {/* Collapsible Quick Demo Accounts */}
                <div className="auth-demo-section">
                  <button
                    type="button"
                    onClick={() => setShowDemoAccounts(!showDemoAccounts)}
                    className="auth-demo-toggle-btn"
                  >
                    <div className="auth-demo-header">
                      <Sparkles size={14} color="#0052CC" />
                      <span>1-Click Demo Accounts ({DEMO_ACCOUNTS.length})</span>
                    </div>
                    {showDemoAccounts ? (
                      <ChevronUp size={16} color="#5E6C84" />
                    ) : (
                      <ChevronDown size={16} color="#5E6C84" />
                    )}
                  </button>

                  {showDemoAccounts && (
                    <div className="auth-demo-list">
                      {DEMO_ACCOUNTS.map((demo) => (
                        <button
                          key={demo.email}
                          type="button"
                          onClick={() => handleQuickDemoLogin(demo)}
                          className={`auth-demo-btn ${demo.isAdmin ? "admin" : ""}`}
                        >
                          <div className="auth-demo-info">
                            <Avatar
                              user={{ name: demo.name }}
                              size="sm"
                              tooltip={false}
                            />
                            <div>
                              <div className="auth-demo-name">{demo.name}</div>
                              <div
                                className="auth-demo-role"
                                style={{ color: demo.badgeColor }}
                              >
                                {demo.role}
                              </div>
                            </div>
                          </div>
                          <ArrowRight size={14} color="var(--color-primary-500)" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </form>
            ) : (
              /* Register Form */
              <form onSubmit={handleRegisterSubmit} className="auth-form-body">
                <div className="auth-title-block">
                  <h2 className="auth-title">Join Sprintr</h2>
                  <p className="auth-subtitle">
                    Create your account to start direct messaging and sprint tracking. Organization Admins will assign your organization and team roles.
                  </p>
                </div>

                <div className="auth-form-fields">
                  <div className="auth-input-group">
                    <label className="auth-input-label">
                      Full Name{" "}
                      <span style={{ color: "var(--color-danger-500)" }}>*</span>
                    </label>
                    <div className="auth-input-wrapper">
                      <User size={16} className="auth-input-icon" />
                      <input
                        type="text"
                        placeholder="e.g. Jane Doe"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="auth-input"
                        required
                      />
                    </div>
                  </div>

                  <div className="auth-input-group">
                    <label className="auth-input-label">
                      Company / Organization Name{" "}
                      <span style={{ color: "var(--color-danger-500)" }}>*</span>
                    </label>
                    <div className="auth-input-wrapper">
                      <Radio size={16} className="auth-input-icon" />
                      <input
                        type="text"
                        placeholder="e.g. Acme Corporation or Sprintr Tech"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        className="auth-input"
                        required
                      />
                    </div>
                  </div>

                  <div className="auth-input-group">
                    <label className="auth-input-label">
                      Work Email{" "}
                      <span style={{ color: "var(--color-danger-500)" }}>*</span>
                    </label>
                    <div className="auth-input-wrapper">
                      <Mail size={16} className="auth-input-icon" />
                      <input
                        type="email"
                        placeholder="name@sprintr.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="auth-input"
                        required
                      />
                    </div>
                  </div>

                  <div className="auth-input-group">
                    <label className="auth-input-label">
                      Password{" "}
                      <span style={{ color: "var(--color-danger-500)" }}>*</span>
                    </label>
                    <div className="auth-input-wrapper">
                      <Lock size={16} className="auth-input-icon" />
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder="At least 6 characters"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="auth-input"
                        style={{ paddingRight: "40px" }}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{
                          position: "absolute",
                          right: "12px",
                          background: "transparent",
                          border: "none",
                          cursor: "pointer",
                          color: "#7A869A",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: 0,
                        }}
                        title={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting || !name || !email || !password}
                    className="btn btn-primary auth-submit-btn"
                  >
                    {isSubmitting
                      ? "Creating account..."
                      : "Create Account & Sign In"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
