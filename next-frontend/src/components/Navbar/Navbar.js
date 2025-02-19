import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Image from 'next/image';
import styles from './Navbar.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch } from '@fortawesome/free-solid-svg-icons';
import { IoCartOutline } from 'react-icons/io5';
import { FaRegUser } from 'react-icons/fa';
import { FaCaretDown } from 'react-icons/fa';
import { useCart } from '../Cart/CartProvider';

const Navbar = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [mounted, setMounted] = useState(false);
  const [activeSport, setActiveSport] = useState(null);
  const [recentCardSets, setRecentCardSets] = useState([]);
  const [popularCardSets, setPopularCardSets] = useState([]);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const router = useRouter();
  const { cart } = useCart();
  const sidePanelRef = useRef(null);
  const miniPanelRef = useRef(null);
  const activeSportIndex = useRef(null);

  const mainSports = ['Baseball', 'Basketball', 'Football', 'Pokemon (English)', 'Pokemon (Japan)', 'Hockey'];
  const moreSports = ['Soccer', 'UFC', 'Golf'];

  useEffect(() => {
    const checkLoginStatus = () => {
      const loggedIn = localStorage.getItem('isLoggedIn') === 'true';
      setIsLoggedIn(loggedIn);
      if (loggedIn) {
        const token = localStorage.getItem('accessToken');
        if (token) {
          const decodedToken = JSON.parse(atob(token.split('.')[1]));
          setUserEmail(decodedToken.email);
        }
      }
    };

    checkLoginStatus();
    window.addEventListener('storage', checkLoginStatus);
    setMounted(true);

    return () => {
      window.removeEventListener('storage', checkLoginStatus);
    };
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    const query = searchQuery.trim();
    
    router.push({
      pathname: '/search',
      query: {
        cardName: query,
        page: '1',
        inStock: router.query.inStock || 'true',
      },
    });
  };

  const toggleSidePanel = () => {
    setIsSidePanelOpen(!isSidePanelOpen);
  };

  const handleSignOut = async () => {
    const sessionId = localStorage.getItem('sessionId');

    if (sessionId) {
      await fetch('/api/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({ sessionId })
      });
    }

    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('sessionId');
    setIsLoggedIn(false);
    router.push('/').then(() => {
      window.location.reload();
    });
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sidePanelRef.current && !sidePanelRef.current.contains(event.target)) {
        setIsSidePanelOpen(false);
      }
      if (miniPanelRef.current && !miniPanelRef.current.contains(event.target)) {
        setActiveSport(null);
      }
    };

    if (isSidePanelOpen || activeSport) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSidePanelOpen, activeSport]);

  const handleNavLinkClick = (sport, index) => {
    if (activeSport === sport) {
      setActiveSport(null);
    } else {
      setActiveSport(sport);
      fetch(`/api/nav-cardsets?sport=${sport}`)
        .then(response => response.json())
        .then(data => setRecentCardSets(data))
        .catch(error => console.error('Error fetching recent card sets:', error));

      // Set popular sets for each sport
      const popularSetsData = {
        'Football': ['Prizm', 'Select', 'Optic', 'Mosaic', 'Donruss', 'Prestige', 'Certified', 'Score', 'Spectra', 'Rookies and Stars'],
        'Baseball': ['Topps', 'Bowman', 'Bowman Chrome', 'Topps Chrome', 'Topps Heritage', 'Donruss', 'Select', 'Upper Deck', 'Mosaic', 'Stadium Club'],
        'Basketball': ['Hoops', 'Panini Prizm', 'Select', 'Mosaic', 'Optic', 'Donruss', 'Hoops Winter', 'Chronicles', 'Totally Ceritifed', 'Prestige'],
        'Hockey': ['O-Pee-Chee', 'O-Pee-Chee Retro', 'Upper Deck', 'Upper Deck Exclusives', 'Parkhurst', 'Artifacts', 'Score', 'MVP', 'Black Diamond', 'Upper Deck Canvas'],
        'Pokemon (English)': ['Evolving Skies', 'Fusion Strike', 'Crown Zenith', 'Base Set', 'Paldea Evolved', '151', 'Astral Radiance', 'Lost Origin', 'Obsidian Flames', 'Paldean Fates'],
        'Pokemon (Japan)': ['Pokemon 151', 'Shiny Treasures ex', 'VSTAR Universe', 'VMAX Climax', 'Blue Sky Stream', 'Eevee Heroes', 'Shiny Star V', 'Clay Burst', 'Night Wanderer', 'Crimson Haze'],
      };
      setPopularCardSets(popularSetsData[sport] || []);

      // Store the index of the active sport
      activeSportIndex.current = index;
    }
  };

  useEffect(() => {
    if (activeSport !== null && miniPanelRef.current) {
      const index = activeSportIndex.current;
      const panelPosition = calculatePanelPosition(index, mainSports.length);
      miniPanelRef.current.style.left = panelPosition.left;
      miniPanelRef.current.style.right = panelPosition.right;
    }
  }, [activeSport]);

  const calculatePanelPosition = (index, total) => {
    if (index < 3) {
      return { left: '0', right: 'auto' }; // Left-aligned
    } else if (index >= total - 3) {
      return { left: 'auto', right: '0' }; // Right-aligned
    } else {
      return { left: '0', right: 'auto' }; // Default
    }
  };

  const handleLinkClick = () => {
    setIsSidePanelOpen(false);
    setActiveSport(null);
  };

  const handleMoreMouseEnter = () => {
    setIsMoreOpen(true);
  };

  const handleMoreMouseLeave = () => {
    setIsMoreOpen(false);
  };

  return (
    <div className={styles.navbarContainer}>
      <div className={styles.headerContainer}>
        <div className={styles.logosContainer}>
          <Link href="/" passHref>
            <Image src="/logo.png" alt="Logo" width={80} height={80} style={{ cursor: 'pointer' }} />
          </Link>
          <a href="https://www.psacard.com" target="_blank" rel="noopener noreferrer">
            <Image src="/psaLogo.png" alt="PSA Logo" width={70} height={70} style={{ cursor: 'pointer', paddingLeft: '10px' }} />
          </a>
        </div>
        <div className={styles.rightNav}>
          <Link href="/grading" passHref legacyBehavior>
            <a className={styles.startSellingButton}>Grading Services</a>
          </Link>
          <FaRegUser onClick={toggleSidePanel} className={`${styles.navIcon} ${styles.faIcon}`} />
          <a href="http://localhost:3001/register" target="_blank" rel="noopener noreferrer">
            <span className={styles.startSellingButton}>Start Selling</span>
          </a>
          <Link href="/cart" passHref legacyBehavior>
            <a className={styles.cartIconWrapper}>
              <IoCartOutline className={`${styles.navIcon} ${styles.mdIcon}`} />
              {mounted && cart.length > 0 && <span className={styles.cartBadge}>{cart.length}</span>}
            </a>
          </Link>
        </div>
      </div>
      {isSidePanelOpen && (
        <div className={styles.sidePanel} ref={sidePanelRef}>
          {isLoggedIn ? (
            <div className={styles.panelContent}>
              <div className={styles.userInfo}>
                <h3>Hello, {userEmail}</h3>
              </div>
              <div className={styles.accountSection}>
                <h3>Account</h3>
                <Link href="/account" passHref legacyBehavior>
                  <a onClick={handleLinkClick}>Account</a>
                </Link>
                <Link href="/order-history" passHref legacyBehavior>
                  <a onClick={handleLinkClick}>Order History</a>
                </Link>
                <Link href="/messages" passHref legacyBehavior>
                  <a onClick={handleLinkClick}>Messages</a>
                </Link>
                <Link href="/payments" passHref legacyBehavior>
                  <a onClick={handleLinkClick}>Payment Methods</a>
                </Link>
                <Link href="/addresses" passHref legacyBehavior>
                  <a onClick={handleLinkClick}>Addresses</a>
                </Link>
              </div>
              <div className={styles.gradingSection}>
                <h3>Grading</h3>
                <Link href="/grading" passHref legacyBehavior>
                  <a onClick={handleLinkClick}>PSA Grading Service</a>
                </Link>
              </div>
              <div className={styles.sellerSection}>
                <h3>Seller</h3>
                <Link href="/dashboard" passHref legacyBehavior>
                  <a onClick={handleLinkClick}>Seller Dashboard</a>
                </Link>
              </div>
              <div className={styles.helpSection}>
                <h3>Help</h3>
                <Link href="/contact" passHref legacyBehavior>
                  <a onClick={handleLinkClick}>Contact Us</a>
                </Link>
                <Link href="/refund" passHref legacyBehavior>
                  <a onClick={handleLinkClick}>Refund Return Policy</a>
                </Link>
                <Link href="/protection" passHref legacyBehavior>
                  <a onClick={handleLinkClick}>GemTCG Order Protection</a>
                </Link>
                <Link href="/about" passHref legacyBehavior>
                  <a onClick={handleLinkClick}>About Us</a>
                </Link>
              </div>
              <button className={styles.signOutButton} onClick={handleSignOut}>Sign Out</button>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                <button className={styles.loginButton} onClick={() => router.push('/login')}>Log In</button>
                <button className={styles.signUpButton} onClick={() => router.push('/register')}>Sign Up</button>
              </div>
            </>
          )}
        </div>
      )}

      <div className={styles.searchBarContainer}>
        <form onSubmit={handleSearch} className={styles.searchForm}>
          <input
            type="text"
            placeholder="Search for cards..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
          <button type="submit" className={styles.searchButton}>
            <FontAwesomeIcon icon={faSearch} style={{ fontSize: '20px', color: 'black' }} />
          </button>
        </form>
      </div>
      <nav className={styles.navbar}>
        <div className={styles.sportsLinks}>
          {mainSports.map((sport, index) => (
            <div key={index} className={styles.navLinkContainer}>
              <div className={styles.navLink} onMouseEnter={() => handleNavLinkClick(sport, index)}>
                {sport}
                <FaCaretDown className={styles.caretIcon} />
              </div>
              {activeSport === sport && (
                <div className={`${styles.miniPanel} ${index >= mainSports.length - 2 ? styles.rightAligned : styles.leftAligned}`} ref={miniPanelRef}>
                  <div className={styles.miniPanelHeader}>
                    <span className={styles.miniPanelSport}><b>{sport}</b></span>
                    <Link
                      href={{
                        pathname: '/search',
                        query: {
                          cardName: '',
                          page: '1',
                          inStock: 'true',
                          sports: sport
                        }
                      }}
                      passHref
                      legacyBehavior
                    >
                      <a className={styles.shopAllButton} onClick={handleLinkClick}>Shop All</a>
                    </Link>
                  </div>
                  <div className={styles.miniPanelContent}>
                    <div>
                      <div className={styles.miniPanelTitle}>Recent Sets</div>
                      <ul className={styles.miniPanelList}>
                        {recentCardSets.map((cardSet, idx) => (
                          <li key={idx}>
                            <Link
                              href={{
                                pathname: '/search',
                                query: {
                                  cardName: '',
                                  page: '1',
                                  inStock: 'true',
                                  sports: sport,
                                  cardSets: cardSet.CardSet
                                }
                              }}
                              passHref
                              legacyBehavior
                            >
                              <a className={styles.miniPanelItem} onClick={handleLinkClick}>{cardSet.CardSet}</a>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className={styles.popularSetsContainer}>
                      <div className={styles.miniPanelTitle}>Popular Sets</div>
                      <ul className={styles.miniPanelList}>
                        {popularCardSets.map((cardSet, idx) => (
                          <li key={idx}>
                            <Link
                              href={{
                                pathname: '/search',
                                query: {
                                  cardName: '',
                                  page: '1',
                                  inStock: 'true',
                                  sports: sport,
                                  cardSets: cardSet
                                }
                              }}
                              passHref
                              legacyBehavior
                            >
                              <a className={styles.miniPanelItem} onClick={handleLinkClick}>{cardSet}</a>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
          <div 
            className={styles.navLinkContainer}
            onMouseEnter={handleMoreMouseEnter}
            onMouseLeave={handleMoreMouseLeave}
          >
            <div className={styles.navLink}>
              More
              <FaCaretDown className={styles.caretIcon} />
            </div>
            {isMoreOpen && (
              <div className={`${styles.miniPanel} ${styles.rightAligned}`} ref={miniPanelRef}>
                <div className={styles.miniPanelHeader}>
                  <span className={styles.miniPanelSport}><b>More Sports</b></span>
                </div>
                <ul className={styles.miniPanelList}>
                  {moreSports.map((sport, index) => (
                    <li key={index}>
                      <Link
                        href={{
                          pathname: '/search',
                          query: {
                            cardName: '',
                            page: '1',
                            inStock: 'true',
                            sports: sport
                          }
                        }}
                        passHref
                        legacyBehavior
                      >
                        <a className={styles.miniPanelItem} onClick={handleLinkClick}>{sport}</a>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </nav>
    </div>
  );
};

export default Navbar;
