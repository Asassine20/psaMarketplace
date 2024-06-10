import React, { useState } from 'react';
import styles from '../../styles/sidepanel/SubmissionForm.module.css';

const SubmissionForm = () => {
    const [currentStep, setCurrentStep] = useState(1);
    const [submissionLevel, setSubmissionLevel] = useState('');
    const [pricePerCard, setPricePerCard] = useState(0); // Add this line
    const [cards, setCards] = useState([{ year: '', set: '', number: '', name: '', type: '', value: '' }]);
    const [submissionDetails, setSubmissionDetails] = useState({
        name: '',
        email: '',
        phone: '',
        instagram: '',
        facebook: '',
        tracking: '',
        hearAboutUs: '',
    });
    const [termsAgreed, setTermsAgreed] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [cardCount, setCardCount] = useState(0);
    const [declaredValue, setDeclaredValue] = useState(''); // Add this line

    const steps = [
        { number: 1, label: 'Submission Level' },
        { number: 2, label: 'Cards' },
        { number: 3, label: 'Submission Details' },
        { number: 4, label: 'Confirm Submission' }
    ];

    const handleNextStep = () => {
        if (currentStep === 1 && !submissionLevel) {
            setAlertMessage('Please select a submission level before continuing');
            return;
        }
        if (currentStep === 2) {
            let allFieldsFilled = true;

            if (cards.length === 0 && !cardCount) {
                setAlertMessage('Please add at least one card or enter a card count before continuing.');
                allFieldsFilled = false;
            } else if (cards.length > 0) {
                cards.forEach(card => {
                    if (!card.year || !card.set || !card.number || !card.name || !card.value) {
                        allFieldsFilled = false;
                    }
                });

                if (!allFieldsFilled) {
                    setAlertMessage('Please fill in the required fields.');
                    return;
                }
            }

            if (allFieldsFilled) {
                setAlertMessage('');
                setCurrentStep(currentStep + 1);
            }
            return;
        }
        if (currentStep === 3) {
            if (!submissionDetails.name || !submissionDetails.email || !submissionDetails.phone || !termsAgreed) {
                setAlertMessage('Please fill in the required fields and agree to the terms before continuing.');
                return;
            }
        }
        if (currentStep < steps.length) {
            setAlertMessage('');
            setCurrentStep(currentStep + 1);
        }
    };

    const handlePreviousStep = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleSubmissionLevelChange = (event) => {
        const selectedLevel = event.target.value;
        const selectedPrice = parseFloat(event.target.getAttribute('data-price'));
        setSubmissionLevel(selectedLevel);
        setPricePerCard(selectedPrice); // Update this line
    };

    const handleAddCard = () => {
        setCards([...cards, { year: '', set: '', number: '', name: '', type: '', value: '' }]);
    };

    const handleRemoveCard = (index) => {
        const newCards = cards.filter((_, i) => i !== index);
        setCards(newCards);
    };

    const handleCardChange = (index, field, value) => {
        const newCards = [...cards];
        newCards[index][field] = value;
        setCards(newCards);
    };

    const handleModalOpen = () => {
        setIsModalOpen(true);
    };

    const handleModalClose = () => {
        setIsModalOpen(false);
    };

    const handleCardCountChange = (event) => {
        setCardCount(event.target.value);
    };

    const handleDeclaredValueChange = (event) => {
        setDeclaredValue(event.target.value);
    };

    const handleCardCountSubmit = () => {
        if (cardCount <= 0 || declaredValue <= 0) {
            setAlertMessage('Please enter valid card count and declared value.');
            return;
        }
        setCards([]); // Clear cards array if using card count only
        setAlertMessage('');
        setIsModalOpen(false);
        handleNextStep(); // Move to the next step
    };

    const handleDetailsChange = (field, value) => {
        setSubmissionDetails({ ...submissionDetails, [field]: value });
    };

    const handleCheckboxChange = (event) => {
        setTermsAgreed(event.target.checked);
    };

    const totalDeclaredValue = cards.reduce((acc, card) => acc + parseFloat(card.value || 0), 0);
    const totalValue = totalDeclaredValue > 0 ? totalDeclaredValue : parseFloat(declaredValue || 0);
    const totalPrice = pricePerCard * (cards.length || cardCount);

    const renderStepContent = () => {
        switch (currentStep) {
            case 1:
                return (
                    <div>
                        {alertMessage && <div className={styles.alert}>{alertMessage}</div>}
                        <h2>Submission Level</h2>
                        <table className={styles.pricingTable}>
                            <thead>
                                <tr>
                                    <th></th>
                                    <th>Submission Level</th>
                                    <th>Max Declared Value/item</th>
                                    <th>Price/item</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td><div className={styles.radioContainer}><input type="radio" name="submissionLevel" value="Trading Card Game" data-price="13.99" className={styles.largeRadioButton} onChange={handleSubmissionLevelChange} /></div></td>
                                    <td>
                                        <div className={styles.headerContainer}>
                                            Trading Card Game and Non-Sports Bulk
                                            <div className={styles.subHeader}>20 Card Minimum</div>
                                            <div className={styles.subHeader}>45 Business Days</div>
                                        </div>
                                    </td>
                                    <td>$200</td>
                                    <td>$13.99</td>
                                </tr>
                                <tr>
                                    <td><div className={styles.radioContainer}><input type="radio" name="submissionLevel" value="June 1980-Present Special" data-price="14.99" className={styles.largeRadioButton} onChange={handleSubmissionLevelChange} /></div></td>
                                    <td>
                                        <div className={styles.headerContainer}>
                                            June 1980-Present Special
                                            <div className={styles.subHeader}>10 Card Minimum</div>
                                            <div className={styles.subHeader}>50 Business Days</div>
                                        </div>
                                    </td>
                                    <td>$300</td>
                                    <td>$14.99</td>
                                </tr>
                                <tr>
                                    <td><div className={styles.radioContainer}><input type="radio" name="submissionLevel" value="Value Bulk (1979-Older)" data-price="17.99" className={styles.largeRadioButton} onChange={handleSubmissionLevelChange} /></div></td>
                                    <td>
                                        <div className={styles.headerContainer}>
                                            Value Bulk (1979-Older)
                                            <div className={styles.subHeader}>20 Card Minimum</div>
                                            <div className={styles.subHeader}>45 Business Days</div>
                                        </div>
                                    </td>
                                    <td>$500</td>
                                    <td>$17.99</td>
                                </tr>
                                <tr>
                                    <td><div className={styles.radioContainer}><input type="radio" name="submissionLevel" value="Value Bulk (1980-Present)" data-price="17.99" className={styles.largeRadioButton} onChange={handleSubmissionLevelChange} /></div></td>
                                    <td>
                                        <div className={styles.headerContainer}>
                                            Value Bulk (1980-Present)
                                            <div className={styles.subHeader}>20 Card Minimum</div>
                                            <div className={styles.subHeader}>45 Business Days</div>
                                        </div>
                                    </td>
                                    <td>$500</td>
                                    <td>$17.99</td>
                                </tr>
                                <tr>
                                    <td><div className={styles.radioContainer}><input type="radio" name="submissionLevel" value="Value (1979-Older)" data-price="23.99" className={styles.largeRadioButton} onChange={handleSubmissionLevelChange} /></div></td>
                                    <td>
                                        <div className={styles.headerContainer}>
                                            Value (1979-Older)
                                        </div>
                                        <div className={styles.subHeader}>45 Business Days</div>
                                    </td>
                                    <td>$500</td>
                                    <td>$23.99</td>
                                </tr>
                                <tr>
                                    <td><div className={styles.radioContainer}><input type="radio" name="submissionLevel" value="Value (1980-Present)" data-price="23.99" className={styles.largeRadioButton} onChange={handleSubmissionLevelChange} /></div></td>
                                    <td>
                                        <div className={styles.headerContainer}>
                                            Value (1980-Present)
                                        </div>
                                        <div className={styles.subHeader}>45 Business Days</div>
                                    </td>
                                    <td>$500</td>
                                    <td>$23.99</td>
                                </tr>
                                <tr>
                                    <td><div className={styles.radioContainer}><input type="radio" name="submissionLevel" value="Value Plus" data-price="38.99" className={styles.largeRadioButton} onChange={handleSubmissionLevelChange} /></div></td>
                                    <td>
                                        <div className={styles.headerContainer}>
                                            Value Plus
                                        </div>
                                        <div className={styles.subHeader}>20 Business Days</div>
                                    </td>
                                    <td>$500</td>
                                    <td>$38.99</td>
                                </tr>
                                <tr>
                                    <td><div className={styles.radioContainer}><input type="radio" name="submissionLevel" value="Regular" data-price="73.99" className={styles.largeRadioButton} onChange={handleSubmissionLevelChange} /></div></td>
                                    <td>
                                        <div className={styles.headerContainer}>
                                            Regular
                                            <div className={styles.subHeader}>10 Business Days</div>
                                        </div>
                                    </td>
                                    <td>$1500</td>
                                    <td>$73.99</td>
                                </tr>
                                <tr>
                                    <td><div className={styles.radioContainer}><input type="radio" name="submissionLevel" value="Express" data-price="124.99" className={styles.largeRadioButton} onChange={handleSubmissionLevelChange} /></div></td>
                                    <td>
                                        <div className={styles.headerContainer}>
                                            Express
                                            <div className={styles.subHeader}>5 Business Days</div>
                                        </div>
                                    </td>
                                    <td>$2500</td>
                                    <td>$124.99</td>
                                </tr>
                                <tr>
                                    <td><div className={styles.radioContainer}><input type="radio" name="submissionLevel" value="Super Express" data-price="244.99" className={styles.largeRadioButton} onChange={handleSubmissionLevelChange} /></div></td>
                                    <td>
                                        <div className={styles.headerContainer}>
                                            Super Express
                                            <div className={styles.subHeader}>5 Business Days</div>
                                        </div>
                                    </td>
                                    <td>$5000</td>
                                    <td>$244.99</td>
                                </tr>
                            </tbody>
                        </table>
                        <div className={styles.buttonContainer}>
                            <div></div>
                            <button className={styles.navigationButton} onClick={handleNextStep}>Next</button>
                        </div>
                    </div>
                );

            case 2:
                return (
                    <div>
                        {alertMessage && <div className={styles.alert}>{alertMessage}</div>}
                        <h2>Cards</h2>
                        <table className={styles.cardTable}>
                            <thead>
                                <tr>
                                    <th>Year*</th>
                                    <th>Set*</th>
                                    <th>Card Number*</th>
                                    <th>Name*</th>
                                    <th>Card Type (Variant / Color)</th>
                                    <th>Declared Value*</th>
                                    <th></th> {/* Column for remove button */}
                                </tr>
                            </thead>
                            <tbody>
                                {cards.map((card, index) => (
                                    <tr key={index}>
                                        <td>
                                            <input
                                                type="text"
                                                value={card.year}
                                                className={!card.year && alertMessage ? styles.errorInput : ''}
                                                onChange={(e) => handleCardChange(index, 'year', e.target.value)}
                                            />
                                        </td>
                                        <td>
                                            <input
                                                type="text"
                                                value={card.set}
                                                className={!card.set && alertMessage ? styles.errorInput : ''}
                                                onChange={(e) => handleCardChange(index, 'set', e.target.value)}
                                            />
                                        </td>
                                        <td>
                                            <input
                                                type="text"
                                                value={card.number}
                                                className={!card.number && alertMessage ? styles.errorInput : ''}
                                                onChange={(e) => handleCardChange(index, 'number', e.target.value)}
                                            />
                                        </td>
                                        <td>
                                            <input
                                                type="text"
                                                value={card.name}
                                                className={!card.name && alertMessage ? styles.errorInput : ''}
                                                onChange={(e) => handleCardChange(index, 'name', e.target.value)}
                                            />
                                        </td>
                                        <td>
                                            <input
                                                type="text"
                                                value={card.type}
                                                onChange={(e) => handleCardChange(index, 'type', e.target.value)}
                                            />
                                        </td>
                                        <td>
                                            <input
                                                type="text"
                                                value={card.value}
                                                className={!card.value && alertMessage ? styles.errorInput : ''}
                                                onChange={(e) => handleCardChange(index, 'value', e.target.value)}
                                            />
                                        </td>
                                        <td><button className={styles.removeButton} onClick={() => handleRemoveCard(index)}>Remove</button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className={styles.buttonContainer}>
                            <button className={styles.modalButton} onClick={handleModalOpen}>Submit Card Count Only</button>
                            <button className={styles.addButton} onClick={handleAddCard}>+ Add Card</button>
                        </div>
                        <div className={styles.cardCount}>
                            <p>Total Cards: {cards.length}</p>
                            <p>Total Declared Value: ${totalValue.toFixed(2)}</p>
                            <p>Total Price: ${totalPrice.toFixed(2)}</p> {/* Add this line */}
                        </div>
                        <div className={styles.buttonContainer}>
                            <button className={styles.navigationButton} onClick={handlePreviousStep}>Previous</button>
                            <button className={styles.navigationButton} onClick={() => {
                                let allFieldsFilled = true;

                                if (cards.length === 0 && !cardCount) {
                                    setAlertMessage('Please add at least one card or enter a card count before continuing.');
                                    allFieldsFilled = false;
                                } else {
                                    const newCards = [...cards];

                                    newCards.forEach(card => {
                                        if (!card.year || !card.set || !card.number || !card.name || !card.value) {
                                            allFieldsFilled = false;
                                        }
                                    });

                                    if (!allFieldsFilled) {
                                        setAlertMessage('Please fill in the required fields.');
                                        setCards(newCards); // Update state to trigger re-render and apply styles
                                    }
                                }

                                if (allFieldsFilled) {
                                    setAlertMessage('');
                                    handleNextStep();
                                }
                            }}>Next</button>
                        </div>
                        {isModalOpen && (
                            <div className={styles.modal}>
                                <div className={styles.modalContent}>
                                    <h3>Submit Card Count Only</h3>
                                    <p>Entering just the card count will incur an additional $2 per card.</p>
                                    <input type="number" className={styles.modalInput} value={cardCount} onChange={handleCardCountChange} placeholder="Card Count" />
                                    <input type="number" className={styles.modalInput} value={declaredValue} onChange={handleDeclaredValueChange} placeholder="Total Declared Value" />
                                    <div className={styles.modalButtonContainer}>
                                        <button className={styles.modalButton} onClick={handleModalClose}>Close</button>
                                        <button className={styles.modalButton} onClick={handleCardCountSubmit}>Submit</button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                );

            case 3:
                return (
                    <div>
                        {alertMessage && <div className={styles.alert}>{alertMessage}</div>}
                        <h2>Submission Details</h2>
                        <form className={styles.detailsForm}>
                            <div className={styles.formGroup}>
                                <label>Name*</label>
                                <input
                                    type="text"
                                    value={submissionDetails.name}
                                    onChange={(e) => handleDetailsChange('name', e.target.value)}
                                    className={!submissionDetails.name && alertMessage ? styles.errorInput : ''}
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>Email*</label>
                                <input
                                    type="email"
                                    value={submissionDetails.email}
                                    onChange={(e) => handleDetailsChange('email', e.target.value)}
                                    className={!submissionDetails.email && alertMessage ? styles.errorInput : ''}
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>Phone Number*</label>
                                <input
                                    type="text"
                                    value={submissionDetails.phone}
                                    onChange={(e) => handleDetailsChange('phone', e.target.value)}
                                    className={!submissionDetails.phone && alertMessage ? styles.errorInput : ''}
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>Instagram Name</label>
                                <input
                                    type="text"
                                    value={submissionDetails.instagram}
                                    onChange={(e) => handleDetailsChange('instagram', e.target.value)}
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>Facebook Name</label>
                                <input
                                    type="text"
                                    value={submissionDetails.facebook}
                                    onChange={(e) => handleDetailsChange('facebook', e.target.value)}
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>Tracking Number</label>
                                <input
                                    type="text"
                                    value={submissionDetails.tracking}
                                    onChange={(e) => handleDetailsChange('tracking', e.target.value)}
                                />
                                <span className={styles.descriptor}>Add the tracking for your package so you can check in on the shipping status</span>
                            </div>
                            <div className={styles.formGroup}>
                                <label>How did you hear about us?</label>
                                <input
                                    type="text"
                                    value={submissionDetails.hearAboutUs}
                                    onChange={(e) => handleDetailsChange('hearAboutUs', e.target.value)}
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>
                                    <input type="checkbox" checked={termsAgreed} onChange={handleCheckboxChange} />
                                    * I agree that the cards I am submitting are not trimmed or altered in any way
                                </label>
                            </div>
                            <div className={styles.totalPrice}>
                                <p>Total Declared Value: ${totalValue.toFixed(2)}</p>
                                <p>Total Price: ${totalPrice.toFixed(2)}</p> {/* Add this line */}
                            </div>
                            <div className={styles.buttonContainer}>
                                <button className={styles.navigationButton} onClick={handlePreviousStep}>Previous</button>
                                <button className={styles.navigationButton} onClick={() => {
                                    if (!submissionDetails.name || !submissionDetails.email || !submissionDetails.phone || !termsAgreed) {
                                        setAlertMessage('Please fill in the required fields and agree to the terms before continuing.');
                                    } else {
                                        setAlertMessage('');
                                        handleNextStep();
                                    }
                                }}>Next</button>
                            </div>
                        </form>
                    </div>
                );
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.panel}>
                <div className={styles.steps}>
                    {steps.map(step => (
                        <div
                            key={step.number}
                            className={`${styles.step} ${currentStep === step.number ? styles.active : ''}`}
                        >
                            <div className={styles.stepNumber}>{step.number}</div>
                            <div className={styles.stepLabel}>{step.label}</div>
                        </div>
                    ))}
                </div>
                <div className={styles.content}>
                    {renderStepContent()}
                </div>
            </div>
        </div>
    );
};

export default SubmissionForm;
