import React, { useState, useEffect, useRef } from 'react';
import './BannerCarousel.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClock } from '@fortawesome/free-regular-svg-icons';
import { faChevronLeft, faChevronRight, faDollarSign } from '@fortawesome/free-solid-svg-icons';

const banners = [
  {
    class: 'banner-image-1',
    content: 'Shop For PSA Graded Cards From Top Rated Sellers',
    icon: null,
    images: [
      'https://d1htnxwo4o0jhw.cloudfront.net/cert/154592358/4w2WeHLJ_EaXv3fmYB-djA.jpg',
      'https://d1htnxwo4o0jhw.cloudfront.net/cert/142410235/wy6-8FkID02Zocr536Xedg.jpg',      
      'https://d1htnxwo4o0jhw.cloudfront.net/cert/127292720/357028721.jpg',
      'https://d1htnxwo4o0jhw.cloudfront.net/cert/155604130/U0NwRHbjT0y59a_o4Ti1Lg.jpg',
      'https://d1htnxwo4o0jhw.cloudfront.net/cert/153286242/iWSyVG4UzUyzuOBmjsD2LQ.jpg'
    ]
  },
  {
    class: 'banner-image-2',
    content: 'Sell Cards In Seconds',
    icon: <FontAwesomeIcon icon={faClock} />,
    images: []
  },
  {
    class: 'banner-image-3',
    content: 'Earn More With Zero Seller Fees',
    icon: <FontAwesomeIcon icon={faDollarSign} />,
    images: []
  }
];

const BannerCarousel = () => {
    const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
    const intervalRef = useRef(null);
  
    // Abstracted function to reset the timer
    const resetTimer = () => {
      clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => {
        setCurrentBannerIndex((prevIndex) => (prevIndex + 1) % banners.length);
      }, 5000); // Adjust the duration as needed
    };
  
    // Initialize the timer or reset it when the component mounts or currentBannerIndex changes
    useEffect(() => {
      resetTimer();
      return () => clearInterval(intervalRef.current); // Cleanup on unmount
    }, [currentBannerIndex]);
  
    const navigateToPrevious = () => {
      setCurrentBannerIndex((prevIndex) => prevIndex === 0 ? banners.length - 1 : prevIndex - 1);
      resetTimer(); // Reset timer on manual navigation
    };
  
    const navigateToNext = () => {
      setCurrentBannerIndex((prevIndex) => (prevIndex + 1) % banners.length);
      resetTimer(); // Reset timer on manual navigation
    };
  
    // Adjusted circle click handler to reset timer
    const handleCircleClick = (index) => {
      setCurrentBannerIndex(index);
      resetTimer(); // Reset timer on circle click
    };
    const currentBanner = banners[currentBannerIndex];

  
    return (
      <div className="banner-carousel-wrapper">
        <div className={`banner-container ${banners[currentBannerIndex].class}`}>
          <div className="images-container">
            {currentBanner.images.length > 0 ? currentBanner.images.map((imgSrc, index) => (
              <img key={index} src={imgSrc} alt={`Banner ${index + 1}`} className="banner-image" />
            )) : <div className="banner-fallback"></div>}
          </div>
          <div className="banner-content">
            {currentBanner.icon}
            <span>{currentBanner.content}</span>
          </div>
        </div>
        <div className="banner-navigation">
          <FontAwesomeIcon icon={faChevronLeft} onClick={navigateToPrevious} className="banner-nav-arrow" />
          <div className="banner-indicators">
            {banners.map((_, index) => (
                <span key={index} className={`banner-indicator ${index === currentBannerIndex ? 'active' : ''}`} onClick={() => handleCircleClick(index)}></span>
            ))}
          </div>
          <FontAwesomeIcon icon={faChevronRight} onClick={navigateToNext} className="banner-nav-arrow" />
        </div>
      </div>
    );
  };
  
  export default BannerCarousel;