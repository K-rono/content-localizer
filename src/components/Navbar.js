import React from 'react';
import { Link } from 'react-router-dom';
import { signOut } from 'aws-amplify/auth';

const Navbar = ({ user, onSignOut }) => {
  const handleSignOut = async () => {
    try {
      await signOut();
      onSignOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <nav className="navbar">
      <div className="container">
        <Link to="/" style={{ textDecoration: 'none', color: 'white' }}>
          <h1>Content Localizer</h1>
        </Link>
        <div className="nav-links">
          <Link to="/">Dashboard</Link>
          <div className="user-info">
            <span>Welcome, {user?.attributes?.email || user?.username}</span>
            <button className="btn btn-secondary" onClick={handleSignOut}>
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
