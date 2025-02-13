import React, { useState } from 'react'

const TransferModal = ({ isOpen, onClose }) => {
  const [amount, setAmount] = useState(0)
  const [isPublic, setIsPublic] = useState(true)

  if (!isOpen) return null

  return (
    <div className="modal-overlay">
      <div className="modal-content transfer-modal">
        <div className="token-dropdown">
          Token Dropdown
        </div>
        
        <div className="shield-toggle">
          <button 
            className={`toggle-btn ${isPublic ? 'active' : ''}`}
            onClick={() => setIsPublic(true)}
          >
            Shield
          </button>
          <button className="toggle-btn toggle-center">
            Toggle
          </button>
          <button 
            className={`toggle-btn ${!isPublic ? 'active' : ''}`}
            onClick={() => setIsPublic(false)}
          >
            Unshield
          </button>
        </div>

        <div className="balance-containers">
          <div className="balance-box">
            <div className="balance-label">Public</div>
            <div className="balance-amount">Balance: 550</div>
          </div>
          <div className="balance-arrow">→</div>
          <div className="balance-box">
            <div className="balance-label">Private</div>
            <div className="balance-amount">Balance: 100</div>
          </div>
        </div>

        <div className="amount-input">
          <input 
            type="number" 
            value={amount} 
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
          />
          <div className="max-label">Max</div>
        </div>

        <div className="modal-actions">
          <button className="cancel-btn" onClick={onClose}>
            Cancel
          </button>
          <button className="submit-btn">
            Submit
          </button>
        </div>
      </div>
    </div>
  )
}

export default TransferModal
