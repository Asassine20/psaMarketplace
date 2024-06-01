import React, { createContext, useContext, useState, useEffect } from 'react';
import useAuth from '../../hooks/useAuth';
import { v4 as uuidv4 } from 'uuid';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const { userId, accessToken } = useAuth();
  const [cart, setCart] = useState([]);
  const [savedForLater, setSavedForLater] = useState([]);
  const [sessionId, setSessionId] = useState(() => {
    if (typeof window !== 'undefined') {
      let sessionId = localStorage.getItem('sessionId');
      if (!sessionId) {
        sessionId = uuidv4();
        localStorage.setItem('sessionId', sessionId);
      }
      return sessionId;
    }
    return null;
  });

  useEffect(() => {
    if (userId) {
      // If user is logged in, clear sessionId from local storage to avoid conflicts
      localStorage.removeItem('sessionId');
    }
  }, [userId]);

  useEffect(() => {
    if (userId || sessionId) {
      fetchCart();
    }
  }, [userId, sessionId, accessToken]);

  const fetchCart = async () => {
    try {
      const headers = {
        'Content-Type': 'application/json',
      };

      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }

      const response = await fetch('/api/cart', {
        headers,
      });

      if (response.ok) {
        const data = await response.json();
        setCart(data.cart || []);
        setSavedForLater(data.savedForLater || []);
      } else {
        console.error("Failed to fetch cart data");
      }
    } catch (error) {
      console.error("Error fetching cart data:", error);
    }
  };

  const updateCart = async (cart, savedForLater) => {
    setCart(cart);
    setSavedForLater(savedForLater);

    try {
      const headers = {
        'Content-Type': 'application/json',
      };

      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }

      // Filter out items with invalid ListingID
      const validCartItems = cart.filter(item => item.ListingID);
      const validSavedForLaterItems = savedForLater.filter(item => item.ListingID);

      const response = await fetch('/api/cart', {
        method: 'POST',
        headers,
        body: JSON.stringify({ cart: validCartItems, savedForLater: validSavedForLaterItems }),
      });

      if (!response.ok) {
        console.error("Failed to update cart data");
      }
    } catch (error) {
      console.error("Error updating cart data:", error);
    }
  };

  const addToCart = (item) => {
    if (!item.ListingID) {
      console.error("Invalid item: ListingID is required", item);
      return;
    }
    const updatedCart = [...cart, item];
    updateCart(updatedCart, savedForLater);
  };

  const removeFromCart = (id) => {
    const updatedCart = cart.filter(item => item.ListingID !== id);
    updateCart(updatedCart, savedForLater);
  };

  const clearCart = () => {
    updateCart([], savedForLater);
  };

  const saveForLater = (id) => {
    const itemToSave = cart.find(item => item.ListingID === id);
    if (!itemToSave) {
      console.error("Invalid item: Item not found in cart");
      return;
    }
    const updatedCart = cart.filter(item => item.ListingID !== id);
    const updatedSavedForLater = [...savedForLater, itemToSave];
    updateCart(updatedCart, updatedSavedForLater);
  };

  const addToCartFromSaved = (id) => {
    const itemToAdd = savedForLater.find(item => item.ListingID === id);
    if (!itemToAdd) {
      console.error("Invalid item: Item not found in saved for later");
      return;
    }
    const updatedSavedForLater = savedForLater.filter(item => item.ListingID !== id);
    const updatedCart = [...cart, itemToAdd];
    updateCart(updatedCart, updatedSavedForLater);
  };

  const removeFromSaved = (id) => {
    const updatedSavedForLater = savedForLater.filter(item => item.ListingID !== id);
    updateCart(cart, updatedSavedForLater);
  };

  const isInCart = (id) => {
    return cart.some(item => item.ListingID === id);
  };

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, clearCart, saveForLater, savedForLater, addToCartFromSaved, removeFromSaved, isInCart }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
