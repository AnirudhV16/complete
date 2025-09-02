/** @format */

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useCart } from "../contexts/CartContext";
import api from "../services/api";
import Loading from "../components/Loading";
import "./Cart.css";
import { useNotifications } from "../components/Notifications";

const Cart = () => {
  const { showSuccess, showError } = useNotifications();
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedItems, setSelectedItems] = useState([]);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const { user } = useAuth();
  const { cartId, updateCartItemCount } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    if (cartId) {
      fetchCartItems();
    }
  }, [cartId]);

  const fetchCartItems = async () => {
    try {
      const response = await api.get(`/api/cart/${cartId}/items`);
      setCartItems(response.data);
      setSelectedItems(response.data.map((item) => item.id));
    } catch (err) {
      setError("Failed to load cart items");
      console.error("Error fetching cart:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveItem = async (productId) => {
    try {
      await api.delete(`/api/cart/${cartId}/remove/${productId}`);
      await fetchCartItems();
      await updateCartItemCount();
      showSuccess("Item removed from cart");
    } catch (err) {
      console.error("Remove item error:", err);
      showError("Failed to remove item from cart");
    }
  };

  const handleItemSelect = (itemId) => {
    setSelectedItems((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleSelectAll = () => {
    if (selectedItems.length === cartItems.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(cartItems.map((item) => item.id));
    }
  };

  const calculateTotal = () => {
    return cartItems
      .filter((item) => selectedItems.includes(item.id) && item.price)
      .reduce((total, item) => total + item.price * item.quantity, 0)
      .toFixed(2);
  };

  const handleCheckout = async () => {
    if (selectedItems.length === 0) {
      alert("Please select items to checkout");
      return;
    }

    setCheckoutLoading(true);
    setError("");

    try {
      const response = await api.post(
        `/api/orders/cart/${cartId}/items`,
        selectedItems
      );

      const order = response.data;

      if (!order || !order.id) {
        throw new Error("Invalid order response");
      }

      navigate(`/checkout/${order.id}`);
    } catch (err) {
      console.error("Checkout error:", err);
      setError(
        "Failed to create order: " +
          (err.response?.data?.message || err.message)
      );
      alert("Failed to create order. Please try again.");
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="cart-page">
      <div className="cart-header">
        <h1>Shopping Cart</h1>
        {cartItems.length > 0 && (
          <button className="select-all-btn" onClick={handleSelectAll}>
            {selectedItems.length === cartItems.length
              ? "Deselect All"
              : "Select All"}
          </button>
        )}
      </div>

      {error && <div className="error-message">{error}</div>}

      {cartItems.length === 0 ? (
        <div className="empty-cart">
          <h2>Your cart is empty</h2>
          <p>Add some products to get started!</p>
          <button
            className="continue-shopping-btn"
            onClick={() => navigate("/products")}
          >
            Continue Shopping
          </button>
        </div>
      ) : (
        <div className="cart-content">
          <div className="cart-items">
            {cartItems.map((item) => {
              if (!item.productName || item.price === undefined) {
                return (
                  <div key={item.id} className="cart-item error-item">
                    <div className="item-details">
                      <h3>Product Unavailable</h3>
                      <p>This product is no longer available</p>
                    </div>
                    <button
                      className="remove-btn"
                      onClick={() => handleRemoveItem(item.productId)}
                    >
                      Remove
                    </button>
                  </div>
                );
              }

              return (
                <div key={item.id} className="cart-item">
                  <div className="item-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(item.id)}
                      onChange={() => handleItemSelect(item.id)}
                    />
                  </div>

                  <div className="item-image-container">
                    {item.productImageUrl ? (
                      <img
                        src={item.productImageUrl}
                        alt={item.productName}
                        className="item-image"
                      />
                    ) : (
                      <div className="item-image-placeholder">📦</div>
                    )}
                  </div>

                  <div className="item-details">
                    <h3>{item.productName}</h3>
                    <p>
                      {item.productDescription || "Description not available"}
                    </p>
                    <div className="item-price">${item.price?.toFixed(2)}</div>
                  </div>

                  <div className="item-quantity-price">
                    <div className="item-quantity">Qty: {item.quantity}</div>
                    <div className="item-total">
                      ${(item.price * item.quantity).toFixed(2)}
                    </div>
                  </div>

                  <div className="item-actions">
                    <button
                      className="remove-btn"
                      onClick={() => handleRemoveItem(item.productId)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="cart-summary">
            <div className="summary-card">
              <h2>Order Summary</h2>
              <div className="summary-row">
                <span>Selected Items:</span>
                <span>{selectedItems.length}</span>
              </div>
              <div className="summary-row total">
                <span>Total:</span>
                <span>${calculateTotal()}</span>
              </div>
              <button
                className="checkout-btn"
                onClick={handleCheckout}
                disabled={selectedItems.length === 0 || checkoutLoading}
              >
                {checkoutLoading ? "Creating Order..." : "Proceed to Checkout"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cart;
