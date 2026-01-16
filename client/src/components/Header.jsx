import useAuthStore from "../store/authStore";
import { NavLink, useNavigate, useLocation, matchPath } from "react-router-dom"; // Added matchPath & useLocation
import React, { useEffect, useState, useRef } from "react";
import useChatStore from "../store/chatStore";
export default function Header({ appName }) {
  const dropdownRef = useRef();
  const location = useLocation(); // Hook to track current URL
  const { user, menus, logout, socket } = useAuthStore();
  const { totalUnreadCount, fetchTotalUnreadCount, incrementUnreadCount } =
    useChatStore();
  const [showProfile, setShowProfile] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const truncateName = (name, maxLength = 20) => {
    if (!name) return "User";
    return name.length > maxLength ? name.slice(0, maxLength) + "..." : name;
  };

  // 1. Fetch initial count on mount
  useEffect(() => {
    if (user) {
      fetchTotalUnreadCount();
    }
  }, [user]);

  // 2. Listen for new messages globally
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = ({ message }) => {
      // Don't increment if we sent it
      if (message.sender?._id === user?._id) return;

      // OPTIONAL: Don't increment if we are currently looking at this specific chat
      // (This logic is usually handled in ChatPage, but strictly for Header visual:)
      // const isActiveChat = location.pathname.includes('/chat') && localStorage.getItem('activeChatId') === message.conversation;
      // if (isActiveChat) return;

      incrementUnreadCount();
    };

    socket.on("new-message", handleNewMessage);

    return () => {
      socket.off("new-message", handleNewMessage);
    };
  }, [socket, user, location]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <>
      {/* ===== HEADER ===== */}
      <header className="d-flex justify-content-between align-items-center px-4 py-2 border-bottom">
        <div className="d-flex align-items-center gap-3">
          {/* ☰ Hamburger (Mobile Only) */}
          <button
            className="btn d-xl-none"
            onClick={() => setShowMobileMenu(!showMobileMenu)}
          >
            <i className="bi bi-list fs-3 text-white"></i>
          </button>

          <NavLink
            to="/dashboard"
            className="m-0 fw-bold text-white text-decoration-none"
            onClick={() => setShowMobileMenu(false)}
          >
            <h4 className="m-0 fw-bold">{appName}</h4>
          </NavLink>
        </div>

        {/* ===== NAVIGATION MENU ===== */}
        <nav className="px-3 py-2">
          <ul
            className={`nav flex-column flex-md-row ${
              showMobileMenu ? "d-flex" : "d-none"
            } d-xl-flex`}
          >
            {menus &&
              menus.map((menu) => {
                const hasSubMenus = menu.subMenus && menu.subMenus.length > 0;
                const isChatMenu = menu.name.toLowerCase() === "chat";

                const isAnyChildActive =
                  hasSubMenus &&
                  menu.subMenus.some((sub) =>
                    matchPath({ path: sub.route, end: true }, location.pathname)
                  );

                return (
                  <li
                    key={menu._id}
                    className={`nav-item ${hasSubMenus ? "dropdown" : ""}`}
                  >
                    {hasSubMenus ? (
                      <>
                        <a
                          /* Toggle 'active' class based on matchPath results */
                          className={`nav-link dropdown-toggle ${
                            isAnyChildActive ? "active" : ""
                          }`}
                          href="#"
                          role="button"
                          data-bs-toggle="dropdown"
                          aria-expanded="false"
                        >
                          {menu.icon && <i className={`${menu.icon} me-1`}></i>}
                          {menu.name}
                        </a>

                        {/* Submenu List */}
                        <ul
                          className="dropdown-menu custom-dropdown"
                          style={{ height: "100px" }}
                        >
                          {menu.subMenus.map((sub) => (
                            <li key={sub._id} className="submenu">
                              <NavLink
                                to={sub.route}
                                className="dropdown-item text-white"
                                onClick={() => setShowMobileMenu(false)}
                              >
                                {sub.icon && (
                                  <i className={`${sub.icon} me-1`}></i>
                                )}
                                {sub.name}
                              </NavLink>
                            </li>
                          ))}
                        </ul>
                      </>
                    ) : (
                      /* Simple Link - NavLink uses useMatch internally */
                      <NavLink
                        to={menu.route}
                        className={({ isActive }) =>
                          isActive ? "nav-link active" : "nav-link"
                        }
                        onClick={() => setShowMobileMenu(false)}
                      >
                        {menu.icon && <i className={`${menu.icon} me-1`}></i>}
                        {menu.name}
                        {/* === RED BADGE === */}
                        {isChatMenu && totalUnreadCount > 0 && (
                          <span
                            className="position-absolute translate-middle badge rounded-pill bg-danger"
                            style={{
                              top: "10px",
                              right: "-15px",
                              fontSize: "0.6rem",
                              zIndex: 10,
                            }}
                          >
                            {totalUnreadCount > 99 ? "99+" : totalUnreadCount}
                          </span>
                        )}
                      </NavLink>
                    )}
                  </li>
                );
              })}
          </ul>
        </nav>

        {/* ===== PROFILE DROPDOWN ===== */}
        <div className="position-relative" ref={dropdownRef}>
          <div
            className="d-flex align-items-center gap-2 cursor-pointer"
            onClick={() => setShowDropdown(!showDropdown)}
          >
            <i className="bi bi-person-circle fs-4"></i>

            <span className="d-none d-sm-inline">
              {truncateName(user?.name)}
            </span>

            <i className="bi bi-caret-down-fill"></i>
          </div>

          {showDropdown && (
            <ul className="dropdown-menu show end-0 mt-2">
              <li>
                <button
                  className="dropdown-item"
                  onClick={() => {
                    setShowProfile(true);
                    setShowDropdown(false);
                  }}
                >
                  <i className="bi bi-person me-2"></i> Profile
                </button>
              </li>
              <li>
                <button
                  className="dropdown-item text-danger"
                  onClick={() => logout()}
                >
                  <i className="bi bi-box-arrow-right me-2"></i> Logout
                </button>
              </li>
            </ul>
          )}
        </div>
      </header>

      {/* ===== PROFILE MODAL ===== */}
      {showProfile && user && (
        <div className="modal fade show d-block" tabIndex="-1">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">My Profile</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowProfile(false)}
                ></button>
              </div>
              <div className="modal-body">
                <p>
                  <strong>Name:</strong> {user.name}
                </p>
                <p>
                  <strong>Email:</strong> {user.email}
                </p>
                <p>
                  <strong>Department:</strong> {user.department}
                </p>
                <p>
                  <strong>Role:</strong> {user.role_id?.name || "N/A"}
                </p>
                <p>
                  <strong>Employee ID:</strong> {user.e_id}
                </p>
                <p style={{ color: "red" }}>
                  <strong>
                    *To change your password, please contact the administrator.
                  </strong>
                </p>
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowProfile(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
          <div
            className="modal-backdrop fade show"
            style={{ zIndex: -1 }}
          ></div>
        </div>
      )}
    </>
  );
}
