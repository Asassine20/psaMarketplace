const express = require('express');
const router = express.Router();
const { authenticateToken, notificationCounts } = require('../middleware/middleware.js');
const db = require('../db');
const redis = require('redis');
const redisClient = redis.createClient();
const axios = require('axios');
const PDFDocument = require('pdfkit');
redisClient.connect();
router.use(express.json()); // This line is crucial

router.use(express.urlencoded({ extended: true }));

router.get('/', (req, res) => {
    res.render('index')
});

router.get('/register', (req, res) => {
    res.render('register')
});

router.get('/register/seller-info', (req, res) => {
    res.render('seller-info');
});

router.post('/check-store-name', async (req, res) => {
    const { storeName } = req.body;

    if (!storeName) {
        // If storeName is not provided in the request body, respond accordingly
        return res.status(400).json({ error: true, message: 'Store name is required.' });
    }

    try {
        const query = 'SELECT * FROM Stores WHERE StoreName = ?';
        const [rows] = await db.query(query, [storeName]);
        
        if (rows && rows.length > 0) {
            // Store name exists
            res.json({ exists: true, message: 'Store name already exists' });
        } else {
            // Store name does not exist or no rows returned
            res.json({ exists: false });
        }
    } catch (error) {
        console.error("Check Store Name Error: ", error);
        res.status(500).json({ error: true, message: 'An error occurred' });
    }
});


router.get('/login', (req, res) => {
    res.render('login')
});

router.get('/admin/dashboard', authenticateToken, notificationCounts, async (req, res) => {
    const userId = req.user.id; // Assuming authentication middleware sets req.user.id

    try {
        // Fetch feedback stats (reuse the getFeedbackStats function)
        const feedbackStats = await getFeedbackStats(userId);

        // Fetch inventory count
        const inventoryQuery = `SELECT COUNT(*) AS inventoryCount FROM Inventory WHERE SellerID = ?`;
        // Assuming db.query returns an array of RowDataPacket objects as is standard
        const [results] = await db.query(inventoryQuery, [userId]);
        const inventoryCount = Number(results.inventoryCount ?? 0);


        // Correctly calculate total sales - Ensure this references the correct table
        const salesSumQuery = `SELECT SUM(SalePrice) AS totalValue FROM Inventory WHERE SellerID = ?`; // Adjusted to 'Sales' table
        const [salesSumResults] = await db.query(salesSumQuery, [userId]);
        const totalValue = Number(salesSumResults.totalValue ?? 0);

        // New query to calculate total sales from Orders
        const totalSalesQuery = `SELECT SUM(SalePrice) AS totalSales FROM Orders WHERE SellerID = ?`;
        const [totalSalesResults] = await db.query(totalSalesQuery, [userId]);
        const totalSales = Number(totalSalesResults.totalSales ?? 0);

        // New query to fetch the user's DateCreated
        const userDateCreatedQuery = `SELECT DateCreated FROM Users WHERE UserID = ?`;
        const [userDateCreatedResults] = await db.query(userDateCreatedQuery, [userId]);
        const userDateCreated = userDateCreatedResults.DateCreated ?? 'Not available';

        // Render the dashboard page with feedback stats, inventory count, and total sales
        res.render('dashboard', {
            feedbackStats: feedbackStats,
            inventoryCount: inventoryCount,
            totalValue: totalValue,
            totalSales: totalSales,
            userDateCreated: userDateCreated
        });
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        res.status(500).send('Server error');
    }
});

router.get('/logout', (req, res) => {
    res.clearCookie('jwt');
    res.redirect('login');
});


function getSurroundingPages(currentPage, totalPages) {
    const range = 2; // Determines how many pages to show around the current page
    let startPage = Math.max(1, currentPage - range);
    let endPage = Math.min(totalPages, currentPage + range);

    let pages = [];
    for (let page = startPage; page <= endPage; page++) {
        pages.push(page);
    }
    return pages;
}

router.get('/admin/inventory', authenticateToken, notificationCounts, async (req, res) => {
    const sellerId = req.user.id; // Assuming the user's ID is stored in req.user
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.pageSize) || 25;
    const offset = (page - 1) * limit;
    const searchTerm = req.query.searchTerm || '';
    const cardSet = req.query.cardSet || '';
    const cardYear = req.query.cardYear || '';
    const sport = req.query.sport || '';
    const cardColor = req.query.cardColor || '';
    const cardVariant = req.query.cardVariant || '';
    //const sortColumn = req.query.sortColumn; 
    //const sortOrder = req.query.sortOrder; 
    const cacheKey = `inventory:${sellerId}:${page}:${limit}:${searchTerm}:${cardSet}:${cardYear}:${sport}:${cardColor}:${cardVariant}`;

    try {
        let whereConditions = [];
        let values = [];

        if (searchTerm) {
            whereConditions.push("CardName LIKE ?");
            values.push(`${searchTerm.trim()}%`);
        }
        
        if (cardSet) {
            whereConditions.push("CardSet = ?");
            values.push(cardSet);
        }
        if (cardYear) {
            whereConditions.push("CardYear = ?");
            values.push(cardYear);
        }
        if (sport) {
            whereConditions.push("Sport = ?");
            values.push(sport);
        }
        if (cardColor) {
            whereConditions.push("CardColor = ?");
            values.push(cardColor);
        }
        if (cardVariant) {
            whereConditions.push("CardVariant = ?");
            values.push(cardVariant);
        }

        /*let orderByClause = '';
        if (sortColumn && sortOrder) {
            // Ensure the sort column and order are valid to prevent SQL injection
            const validSortColumns = ['Sport', 'CardName', 'CardSet', 'CardYear', 'CardNumber', 'CardColor', 'CardVariant'];
            const validSortOrder = ['asc', 'desc'];
            if (validSortColumns.includes(sortColumn) && validSortOrder.includes(sortOrder)) {
                orderByClause = ` ORDER BY ${sortColumn} ${sortOrder}`;
            } else {
                return res.status(400).send('Invalid sort parameters');
            }
        }
*/
        let query = "SELECT * FROM Card";
        if (whereConditions.length) {
            query += " WHERE " + whereConditions.join(" AND ");
        }

        //query += orderByClause; // Apply the dynamic ORDER BY clause
        query += " LIMIT ? OFFSET ?";
        values.push(limit, offset);

        // Similar logic for the countQuery (without ORDER BY and LIMIT/OFFSET)
        let countQuery = "SELECT COUNT(*) AS count FROM Card";
        if (whereConditions.length) {
            countQuery += " WHERE " + whereConditions.join(" AND ");
        }
        const countValues = [...values].slice(0, -2); // Exclude limit and offset for count query
        const cards = await db.query(query, values);

        const totalResult = await db.query(countQuery, countValues);
        const totalItems = totalResult[0].count; 
        const totalPages = Math.ceil(totalItems / limit);
        const startPage = Math.max(1, page - 2); // Show 2 pages before the current page
        const endPage = Math.min(totalPages, page + 2); // Show 2 pages after the current page
        
        // Generate page numbers for the pagination
        let pages = Array.from({ length: (endPage - startPage) + 1 }, (_, i) => startPage + i);
        const showPrevious = page > 1;
        const showNext = page < totalPages;

        const cardSetsData = await db.query('SELECT DISTINCT CardSet FROM Card');
        const cardYearsData = await db.query('SELECT DISTINCT CardYear FROM Card');
        const sportsData = await db.query('SELECT DISTINCT Sport FROM Card');    
        const cardColorsData = await db.query('SELECT DISTINCT CardColor FROM Card WHERE CardColor IS NOT NULL AND CardColor != \'\'');
        const cardVariantsData = await db.query('SELECT DISTINCT CardVariant FROM Card WHERE CardVariant IS NOT NULL');
        // Fetch inventory with a flag for in-stock items
        const inventoryQuery = 'SELECT *, (ListingID IS NOT NULL) AS isInStock FROM Inventory WHERE SellerID = ?';
        const inventoryItems = await db.query(inventoryQuery, [sellerId]);

        // Create a Set of CardIDs that are in stock
        const inStockCardIds = new Set(inventoryItems.filter(item => item.isInStock).map(item => item.CardID));

        // Map over the cards to include isInStock property
        const updatedCards = cards.map(card => ({
        ...card,
        isInStock: inStockCardIds.has(card.CardID) // Set isInStock to true if CardID is in the inStockCardIds set
        }));


        const cacheData = {
            ajaxData: {
                cards: updatedCards,
                currentPage: page,
                totalPages: totalPages,
                pages: pages,
                showPrevious: page > 1,
                showNext: page < totalPages,
                showFirst: page > 1,
                showLast: page < totalPages,
                totalItems: totalItems,
            },
            pageData: {
                username: req.user.username,
                cards: updatedCards,
                searchTerm,
                cardSet,
                cardYear,
                sport,
                cardSets: cardSetsData.map(row => row.CardSet),
                cardYears: cardYearsData.map(row => row.CardYear),
                sports: sportsData.map(row => row.Sport),
                cardColors: cardColorsData.map(row => row.CardColor).filter(color => color.trim() !== ''),
                cardVariants: cardVariantsData.map(row => row.CardVariant),
                pages: pages,
                currentPage: page,
                totalPages,
                showPrevious: page > 1,
                showNext: page < totalPages,
                showFirst: page > 1,
                showLast: page < totalPages,
                totalItems,
                inventoryItems
            }
        };

        await redisClient.setEx(cacheKey, 3600, JSON.stringify(cacheData)); // Cache for 1 hour

        // Then send the response...
        if (req.headers['x-requested-with'] === 'XMLHttpRequest') {
            res.json(cacheData.ajaxData);
        } else {
            res.render('inventory', cacheData.pageData);
        }
    } catch (error) {
        console.error('Error fetching inventory:', error);
        res.status(500).send('Server error');
    }
});

async function preWarmCache() {
    // Define common queries or parameters based on dropdown filters
    const commonQueries = [
        { searchTerm: '', cardSet: '', cardYear: '', sport: 'Football', cardColor: '', cardVariant: '' },
        { searchTerm: '', cardSet: '', cardYear: '', sport: 'Basketball', cardColor: '', cardVariant: '' },
        { searchTerm: '', cardSet: '', cardYear: '', sport: 'Baseball', cardColor: '', cardVariant: '' },
        { searchTerm: '', cardSet: '', cardYear: '', sport: 'Hockey', cardColor: '', cardVariant: '' },
        { searchTerm: '', cardSet: '', cardYear: '', sport: 'Pokemon (Japan)', cardColor: '', cardVariant: '' },
        { searchTerm: '', cardSet: '', cardYear: '', sport: 'Pokemon (English)', cardColor: '', cardVariant: '' }
    ];

    // Wrap each query in a function that catches and handles its errors
    const prewarmPromises = commonQueries.map(query => {
        return fetchInventoryData(query)
            .then(data => {
                const cacheKey = `inventory:prewarm:${JSON.stringify(query)}`;
                return redisClient.setEx(cacheKey, 3600, JSON.stringify(data))
            })
            .catch(error => {
                console.error(`Error pre-warming cache for query ${JSON.stringify(query)}:`, error);
                return null;
            });
    });

    // Use Promise.all to execute all pre-warm operations in parallel
    try {
        await Promise.all(prewarmPromises);
        console.log('Cache pre-warming complete.');
    } catch (error) {
        // This catch block will now only catch unexpected errors, not individual promise rejections
        console.error('Unexpected error during cache pre-warming:', error);
    }
}

async function fetchInventoryData({ searchTerm, cardSet, cardYear, sport, cardColor, cardVariant }) {
    let whereConditions = [];
    let values = [];

    if (searchTerm) whereConditions.push("CardName = ?"), values.push(searchTerm);
    if (cardSet) whereConditions.push("CardSet = ?"), values.push(cardSet);
    if (cardYear) whereConditions.push("CardYear = ?"), values.push(cardYear);
    if (sport) whereConditions.push("Sport = ?"), values.push(sport);
    if (cardColor) whereConditions.push("CardColor = ?"), values.push(cardColor);
    if (cardVariant) whereConditions.push("CardVariant = ?"), values.push(cardVariant);

    let query = "SELECT * FROM Card";
    if (whereConditions.length) query += " WHERE " + whereConditions.join(" AND ");
    query += " LIMIT 300000";
    try {
        const cards = await db.query(query, values);
        return cards; // Assuming db.query returns the result set
    } catch (error) {
        console.error('Error fetching inventory for pre-warming:', error);
        return [];
    }
}

// Assuming you want to call preWarmCache at application startup
preWarmCache().catch(console.error);

router.get('/admin/cardsets', authenticateToken, notificationCounts, async (req, res) => {
    const sport = req.query.sport || '';
    const year = req.query.year || '';
    const cardColor = req.query.cardColor || '';
    const cardVariant = req.query.cardVariant || '';
    const cacheKey = `cardsets:${sport}:${cardColor}:${year}:${cardVariant}`;


    try {
        // Try to fetch the data from cache first
        const cachedData = await redisClient.get(cacheKey);
        if (cachedData) {
            return res.json(JSON.parse(cachedData));
        }

        let query = "SELECT DISTINCT CardSet FROM Card";
        let conditions = [];
        let values = [];

        if (sport) {
            conditions.push("Sport = ?");
            values.push(sport);
        }
        if (year) {
            conditions.push("CardYear = ?");
            values.push(year);
        }
        if (cardColor) {
            conditions.push("CardColor = ?");
            values.push(cardColor);
        }
        if (cardVariant) {
            conditions.push("CardVariant = ?");
            values.push(cardVariant);
        }

        if (conditions.length) {
            query += " WHERE " + conditions.join(" AND ");
        }

        query += " ORDER BY CardSet";

        // Execute query if not in cache
        const cardSets = await db.query(query, values);
        const cardSetResults = cardSets.map(row => row.CardSet);

        // Cache the result for future requests
        await redisClient.setEx(cacheKey, 3600, JSON.stringify(cardSetResults)); // Cache for 1 hour

        res.json(cardSetResults);
    } catch (error) {
        console.error('Error fetching card sets:', error);
        res.status(500).send('Server error');
    }
});

router.get('/admin/years', authenticateToken,notificationCounts, async (req, res) => {
    const sport = req.query.sport || '';
    const cardSet = req.query.cardSet || '';
    const cardColor = req.query.cardColor || '';
    const cardVariant = req.query.cardVariant || '';
    const cacheKey = `years:${sport}:${cardSet}:${cardColor}:${cardVariant}`;

    try {
        // Check if data is in cache
        const cachedYears = await redisClient.get(cacheKey);
        if (cachedYears) {
            return res.json(JSON.parse(cachedYears));
        }

        // Database query if not in cache
        let query = "SELECT DISTINCT CardYear FROM Card";
        let conditions = [];
        let values = [];

        // Building conditions based on query parameters
        if (sport) {
            conditions.push("Sport = ?");
            values.push(sport);
        }
        if (cardSet) {
            conditions.push("CardSet = ?");
            values.push(cardSet);
        }
        if (cardColor) {
            conditions.push("CardColor = ?");
            values.push(cardColor);
        }
        if (cardVariant) {
            conditions.push("CardVariant = ?");
            values.push(cardVariant);
        }

        if (conditions.length) {
            query += " WHERE " + conditions.join(" AND ");
        }
        query += " ORDER BY CardYear DESC";

        const years = await db.query(query, values);

        // Cache the result before sending response
        await redisClient.setEx(cacheKey, 3600, JSON.stringify(years.map(row => row.CardYear))); // Cache for 1 hour

        res.json(years.map(row => row.CardYear));
    } catch (error) {
        console.error('Error fetching years:', error);
        res.status(500).send('Server error');
    }
});

router.get('/admin/sports', authenticateToken, notificationCounts, async (req, res) => {
    const cardSet = req.query.cardSet || '';
    const year = req.query.year || '';
    const cardColor = req.query.cardColor || '';
    const cardVariant = req.query.cardVariant || '';
    const cacheKey = `sports:${cardSet}:${year}:${cardColor}:${cardVariant}`;

    try {
        const cachedData = await redisClient.get(cacheKey);
        if (cachedData) {
            return res.json(JSON.parse(cachedData));
        }

        let query = "SELECT DISTINCT Sport FROM Card";
        let conditions = [];
        let values = [cardSet, year, cardColor, cardVariant].filter(value => value);

        if (cardSet) conditions.push("CardSet = ?");
        if (year) conditions.push("CardYear = ?");
        if (cardColor) conditions.push("CardColor = ?");
        if (cardVariant) conditions.push("CardVariant = ?");

        if (conditions.length) query += " WHERE " + conditions.join(" AND ");
        query += " ORDER BY Sport";

        const sports = await db.query(query, values);
        await redisClient.setEx(cacheKey, 3600, JSON.stringify(sports.map(row => row.Sport)));

        res.json(sports.map(row => row.Sport));
    } catch (error) {
        console.error(`Error fetching sports:`, error);
        res.status(500).send('Server error');
    }
});


router.get('/admin/cardcolors', authenticateToken, notificationCounts, async (req, res) => {
    const sport = req.query.sport || '';
    const cardSet = req.query.cardSet || '';
    const year = req.query.year || '';
    const cardVariant = req.query.cardVariant || '';
    const cacheKey = `cardcolors:${sport}:${cardSet}:${year}:${cardVariant}`;


    try {
        // Check if data is in cache
        const cachedCardColors = await redisClient.get(cacheKey);
        if (cachedCardColors) {
            return res.json(JSON.parse(cachedCardColors));
        }

        let query = "SELECT DISTINCT CardColor FROM Card WHERE CardColor IS NOT NULL";
        let conditions = [];
        let values = [];

        if (sport) conditions.push("Sport = ?");
        if (cardSet) conditions.push("CardSet = ?");
        if (year) conditions.push("CardYear = ?");
        if (cardVariant) conditions.push("CardVariant = ?");

        values = [sport, cardSet, year, cardVariant].filter(value => value !== '');

        if (values.length) {
            query += " AND " + conditions.join(" AND ");
        }

        query += " ORDER BY CardColor";

        const cardColors = await db.query(query, values);

        // Cache the result before sending response
        await redisClient.setEx(cacheKey, 3600, JSON.stringify(cardColors.map(row => row.CardColor)));

        res.json(cardColors.map(row => row.CardColor));
    } catch (error) {
        console.error('Error fetching card colors:', error);
        res.status(500).send('Server error');
    }
});

router.get('/admin/cardvariants', authenticateToken, notificationCounts, async (req, res) => {
    const sport = req.query.sport || '';
    const cardSet = req.query.cardSet || '';
    const year = req.query.year || '';
    const cardColor = req.query.cardColor || '';
    const cacheKey = `cardvariants:${sport}:${cardSet}:${year}:${cardColor}`;
 

    try {
        // Check if data is in cache
        const cachedCardVariants = await redisClient.get(cacheKey);
        if (cachedCardVariants) {
            return res.json(JSON.parse(cachedCardVariants));
        }

        let query = "SELECT DISTINCT CardVariant FROM Card";
        let conditions = [];
        let values = [];

        if (sport) conditions.push("Sport = ?");
        if (cardSet) conditions.push("CardSet = ?");
        if (year) conditions.push("CardYear = ?");
        if (cardColor) conditions.push("CardColor = ?");

        values = [sport, cardSet, year, cardColor].filter(value => value !== '');

        if (values.length) {
            query += " WHERE " + conditions.join(" AND ");
        }

        query += " ORDER BY CardVariant";

        const cardVariants = await db.query(query, values);

        // Cache the result before sending response
        await redisClient.setEx(cacheKey, 3600, JSON.stringify(cardVariants.map(row => row.CardVariant)));

        res.json(cardVariants.map(row => row.CardVariant));
    } catch (error) {
        console.error('Error fetching card variants:', error);
        res.status(500).send('Server error');
    }
});

// Endpoint for full search
router.get('/admin/search-card-sets', authenticateToken, notificationCounts, async (req, res) => {
    const { term, sport, year, cardColor, cardVariant } = req.query;
    // Generate a unique cache key based on the search parameters
    const cacheKey = `search:cardsets:${term}:${sport}:${year}:${cardColor}:${cardVariant}`;

    try {
        // Attempt to fetch the result from cache first
        const cachedData = await redisClient.get(cacheKey);
        if (cachedData) {
            // If data is found in cache, parse it and return
            return res.json(JSON.parse(cachedData));
        }

        // If no data in cache, proceed with the database query
        let query = "SELECT DISTINCT CardSet FROM Card WHERE CardSet LIKE ?";
        let values = [`${term}%`]; // Search term at the beginning

        // Append conditions for each filter
        if (sport) {
            query += " AND Sport = ?";
            values.push(sport);
        }
        if (year) {
            query += " AND CardYear = ?";
            values.push(year);
        }
        if (cardColor) {
            query += " AND CardColor = ?";
            values.push(cardColor);
        }
        if (cardVariant) {
            query += " AND CardVariant = ?";
            values.push(cardVariant);
        }

        // Add ORDER BY clause here to sort the results alphabetically by CardSet
        query += " ORDER BY CardSet ASC";

        // Execute the database query
        const result = await db.query(query, values);
        const cardSets = result.map(row => row.CardSet);

        // Cache the result for future requests
        await redisClient.setEx(cacheKey, 3600, JSON.stringify(cardSets)); // Cache for 1 hour

        // Return the query result
        res.json(cardSets);
    } catch (error) {
        console.error('Error searching card sets:', error);
        res.status(500).send('Server error');
    }
});

router.get('/admin/update-inventory-pricing', authenticateToken, notificationCounts, async (req, res) => {
    const cardId = req.query.cardId;
    const sellerId = req.user.id;

    try {
        // Fetch all inventory items for the given CardID and SellerID
        const inventoryQuery = 'SELECT * FROM Inventory WHERE CardID = ? AND SellerID = ?';
        const inventoryItems = await db.query(inventoryQuery, [cardId, sellerId]);

        // Fetch the card details
        const cardDetailsQuery = 'SELECT CardID, CardName, CardSet, CardYear, CardNumber, CardColor, CardVariant, CardImage FROM Card WHERE CardID = ?';
        const cardDetails = await db.query(cardDetailsQuery, [cardId]);

        // Fetch grade options
        const gradeQuery = 'SELECT GradeID, GradeValue FROM Grade WHERE CardID = ? ORDER BY GradeValue DESC';
        const grades = await db.query(gradeQuery, [cardId]);



        // Render the page with fetched data
        res.render('update_inventory', {
            existingInventory: inventoryItems, // Pass the entire array of items
            cardDetails: cardDetails.length > 0 ? cardDetails[0] : {},
            grades: grades,
        });

    } catch (error) {
        console.error('Database error:', error);
        res.status(500).send('Server error');
    }
});

router.post('/admin/submit-inventory', authenticateToken, notificationCounts, async (req, res) => {
    const { action, cardId, listingIds = [], gradeIds = [], salePrices = [], certNumbers = [] } = req.body;
    const sellerId = req.user.id;
    const defaultImageUrl = '/images/defaultPSAImage.png'; 

    // Check if the action is to clear the inventory
    if (action === 'clearInventory') {
        try {
            // Delete all inventory items for the given CardID and SellerID
            const deleteQuery = 'DELETE FROM Inventory WHERE CardID = ? AND SellerID = ?';
            await db.query(deleteQuery, [cardId, sellerId]);
            // Redirect after clearing the inventory
            return res.redirect('/admin/inventory');
        } catch (error) {
            console.error('Error clearing inventory:', error);
            return res.status(500).send('Error clearing inventory');
        }
    }

    // Continue with adding/updating inventory if the action is not to clear
    try {
        for (let i = 0; i < gradeIds.length; i++) {
            const listingId = listingIds[i];
            const gradeId = gradeIds[i];
            const salePrice = salePrices[i];
            const certNumber = certNumbers[i];

            let frontImageUrl = null;
            let backImageUrl = null;

            if (certNumber) {
                const images = await getImagesByCertNumber(certNumber, process.env.PSA_API_KEY, process.env.PSA_ACCESS_TOKEN);
                frontImageUrl = images.frontImageUrl;
                backImageUrl = images.backImageUrl;

                if (frontImageUrl && frontImageUrl !== defaultImageUrl) {
                    await updateCardImage(cardId, frontImageUrl, defaultImageUrl);
                }
            }

            if (listingId) {
                const updateQuery = 'UPDATE Inventory SET FrontImageUrl = ?, BackImageUrl = ? WHERE ListingID = ? AND CardID = ?';
                await db.query(updateQuery, [frontImageUrl, backImageUrl, listingId, cardId]);
            } else {
                const insertQuery = 'INSERT INTO Inventory (CardID, GradeID, SalePrice, CertNumber, FrontImageUrl, BackImageUrl, SellerID) VALUES (?, ?, ?, ?, ?, ?, ?)';
                await db.query(insertQuery, [cardId, gradeId, salePrice, certNumber, frontImageUrl, backImageUrl, sellerId]);
            }
        }

        return res.redirect('/admin/inventory');
    } catch (err) {
        console.error('Error processing inventory submission:', err);
        return res.status(500).send('Error processing inventory');
    }
});



// Function to get card data by cert number from the API
async function getCardDataByCertNumber(certNumber, apiKey, accessToken) {
    const url = `https://api.psacard.com/publicapi/cert/GetByCertNumber/${certNumber}`; // Correct variable is 'url'
    try {
        const response = await axios.get(url, { // This should be 'url', not 'endpoint'
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${accessToken}` // Assuming accessToken is the correct way to authenticate
            }
        });

        if (response.data && response.data.PSACert) {
            const { PSACert } = response.data;
            return {
                year: PSACert.Year,
                brand: PSACert.Brand,
                cardNumber: PSACert.CardNumber,
                cardGrade: PSACert.CardGrade,
                subject: PSACert.Subject,
                variety: PSACert.Variety
            };
        }

        return null; // Or handle as appropriate if no data found
    } catch (error) {
        console.error('Error fetching card data from API:', error);
        throw error;
    }
}


// Function to get images by cert number from PSA Card API
async function getImagesByCertNumber(certNumber, apiKey, accessToken) {
    const endpoint = `https://api.psacard.com/publicapi/cert/GetImagesByCertNumber/${certNumber}`;
    try {
      const response = await axios.get(endpoint, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${accessToken}` // Replace with actual access token
        }
      });
  
      // Check if the response contains images
      if (response.data && response.data.length > 0) {
        // Extract the image URLs
        const frontImage = response.data.find(image => image.IsFrontImage)?.ImageURL;
        const backImage = response.data.find(image => !image.IsFrontImage)?.ImageURL;
        return { frontImageUrl: frontImage, backImageUrl: backImage };
      }
  
      return { frontImageUrl: null, backImageUrl: null };
    } catch (error) {
      console.error('Error fetching images from PSA Card API:', error);
      throw error; // Or handle this error as appropriate for your application
    }
}

async function updateCardImage(cardId, newImageUrl, defaultImageUrl) {
    // Include a condition to check if the current CardImage is the default one
    const query = "UPDATE Card SET CardImage = ? WHERE CardID = ? AND CardImage = ?";
    const values = [newImageUrl, cardId, defaultImageUrl]; // Include the default image URL in the values

    try {
        const result = await db.query(query, values);
        return result.affectedRows > 0; // Returns true if the row was updated, false otherwise
    } catch (error) {
        console.error('Error updating CardImage:', error);
        throw error; // Rethrow the error to handle it further up the call stack
    }
}

router.get('/admin/quick-list-inventory', authenticateToken, notificationCounts, async (req, res) => {
    try {
        // Example: sending user info or configurations
        res.render('quick-list-inventory', {
            userInfo: req.user, // Assuming req.user is available and contains user info
            config: { /* some configuration data if needed */ }
        });
    } catch (error) {
        console.error('Error loading add multiple inventory page:', error);
        res.status(500).send('Server error');
    }
});


router.get('/api/fetch-card-data', authenticateToken, notificationCounts, async (req, res) => {
    const { certNumber } = req.query;
    if (!certNumber) {
        return res.status(400).send({ error: 'Cert number is required.' });
    }

    try {
        const cardData = await getCardDataByCertNumber(req.query.certNumber, process.env.PSA_API_KEY, process.env.PSA_ACCESS_TOKEN);
        if (cardData) {
            res.json(cardData);
        } else {
            res.status(404).send({ error: 'Card data not found.' });
        }
    } catch (error) {
        console.error('Error fetching card data:', error);
        res.status(500).send({ error: 'Server error fetching card data.' });
    }
});


// Add this endpoint to your server
router.get('/fetch-card-image', authenticateToken, notificationCounts, async (req, res) => {
    const { certNumber } = req.query;
    if (!certNumber) {
        return res.status(400).send({ error: 'Cert number is required.' });
    }

    try {
        const images = await getImagesByCertNumber(certNumber, process.env.PSA_API_KEY, process.env.PSA_ACCESS_TOKEN);
        if (images.frontImageUrl || images.backImageUrl) {
            res.json(images);
        } else {
            res.status(404).send({ error: 'Images not found.' });
        }
    } catch (error) {
        console.error('Error fetching card images:', error);
        res.status(500).send({ error: 'Server error fetching images.' });
    }
});

router.get('/admin/orders', authenticateToken, notificationCounts, async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 25;
    const offset = (page - 1) * limit;
    const sellerId = req.user.id;

    try {
        const query = `
            SELECT Orders.OrderNumber, Orders.SalePrice, Orders.OrderDate, Users.Username, Shipping.ShipmentStatus
            FROM Orders
            LEFT JOIN Users ON Orders.BuyerID = Users.UserID
            LEFT JOIN Shipping ON Orders.OrderNumber = Shipping.OrderNumber
            WHERE Orders.SellerID = ?
            ORDER BY 
                CASE 
                    WHEN Shipping.ShipmentStatus = 'Awaiting shipment' THEN 1
                    ELSE 2
                END,
                Orders.OrderDate DESC
            LIMIT ? OFFSET ?
        `;
        const orders = await db.query(query, [sellerId, limit, offset]);

        const countQuery = 'SELECT COUNT(*) AS totalOrders FROM Orders WHERE SellerID = ?';
        const totalResult = await db.query(countQuery, [sellerId]);
        const totalOrders = totalResult[0].totalOrders;
        const totalPages = Math.ceil(totalOrders / limit);

        res.render('orders', {
            orders,
            totalOrders,
            page,
            totalPages,
            limit
        });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).send('Server error');
    }
});

router.get('/admin/order-details', authenticateToken, notificationCounts, async (req, res) => {
    const orderNumber = req.query.orderNumber;
    try {
        const orderDetailsQuery = `
            SELECT Orders.*, Users.Username
            FROM Orders
            JOIN Users ON Orders.BuyerID = Users.UserID
            WHERE Orders.OrderNumber = ? 
        `;
        const orderDetails = await db.query(orderDetailsQuery, [orderNumber]);

        const orderItemsQuery = `
            SELECT 
                OrderItems.ListingID, 
                OrderItems.Quantity, 
                OrderItems.Price,
                Card.Sport, 
                Card.CardSet, 
                Card.CardYear, 
                Card.CardName, 
                Card.CardColor, 
                Card.CardVariant
            FROM OrderItems
            JOIN Orders ON OrderItems.OrderNumber = Orders.OrderNumber
            LEFT JOIN Card ON OrderItems.CardID = Card.CardID
            WHERE Orders.OrderNumber = ?
        `;
        const items = await db.query(orderItemsQuery, [orderNumber]);
        const processedItems = items.map(item => {
            const cardDetailsParts = [
                item.Sport,
                item.CardSet,
                item.CardYear,
                item.CardName,
                item.CardColor,
                item.CardVariant
            ].filter(part => part).join(' - ');
            return { ...item, CardDetails: cardDetailsParts };
        });

        const feedbackQuery = 'SELECT * FROM Feedback WHERE OrderNumber = ?';
        const feedback = await db.query(feedbackQuery, [orderNumber]);

        const shippingQuery = 'SELECT * FROM Shipping WHERE OrderNumber = ?';
        const shipping = await db.query(shippingQuery, [orderNumber]);

        const addressId = orderDetails[0].AddressID;
        const addressQuery = 'SELECT * FROM Addresses WHERE AddressID = ?';
        const address = await db.query(addressQuery, [addressId]);

        res.render('order-details', {
            order: orderDetails[0],
            items: processedItems,
            feedback: feedback[0] ? feedback[0] : null,
            shipping: shipping[0] ? shipping[0] : null,
            address: address[0] ? address[0] : null
        });
    } catch (error) {
        console.error('Error fetching order details:', error);
        res.status(500).send('Error fetching order details');
    }
});

router.post('/admin/update-shipping-details', authenticateToken, notificationCounts, async (req, res) => {
    const { orderNumber, ShippedWithTracking, TrackingNumber, EstimatedDeliveryDate, Carrier, CarrierTrackingURL, ShipmentStatus } = req.body;

    try {
        const updateShippingQuery = `
            UPDATE Shipping
            SET 
                Shipping.ShippedWithTracking = ?, 
                Shipping.TrackingNumber = ?, 
                Shipping.EstimatedDeliveryDate = ?, 
                Shipping.Carrier = ?, 
                Shipping.CarrierTrackingURL = ?, 
                Shipping.ShipmentStatus = ?
            WHERE Shipping.OrderNumber = ?
        `;
        
        const result = await db.query(updateShippingQuery, [ShippedWithTracking, TrackingNumber, EstimatedDeliveryDate, Carrier, CarrierTrackingURL, ShipmentStatus, orderNumber]);
        console.log(result);
        
        res.json({ message: 'Shipping details updated successfully' });
    } catch (error) {
        console.error('Error updating shipping details:', error);
        res.status(500).send('Error updating shipping details');
    }
});


router.get('/admin/messages', authenticateToken, notificationCounts, async (req, res) => {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 25;
    const offset = (page - 1) * limit;

    try {
        // Query to get the conversations count for the active user as a seller
        const countQuery = `SELECT COUNT(*) AS conversationCount FROM Conversations WHERE SellerID = ?`;
        const [countResult] = await db.query(countQuery, [userId]);
        const conversationCount = Array.isArray(countResult) ? countResult[0].conversationCount : countResult.conversationCount;
        const totalPages = Math.ceil(conversationCount / limit);

        // Query to get the latest messages and related data, including OrderNumber instead of LatestMessageID
        const latestMessagesQuery = `
            SELECT 
                c.ConversationID,
                c.Subject,
                c.OrderNumber,  
                m.SenderID,
                u.Username AS SenderName,
                m.MessageText,
                m.Timestamp,
                m.IsRead
            FROM Conversations c
            INNER JOIN (
                SELECT 
                    ConversationID, 
                    MAX(MessageID) AS LatestMessageID
                FROM Messages
                GROUP BY ConversationID
            ) lm ON c.ConversationID = lm.ConversationID
            INNER JOIN Messages m ON lm.LatestMessageID = m.MessageID
            INNER JOIN Users u ON m.SenderID = u.UserID
            WHERE c.SellerID = ? OR c.BuyerID = ?
            ORDER BY m.Timestamp DESC
            LIMIT ? OFFSET ?`;

        const conversations = await db.query(latestMessagesQuery, [userId, userId, limit, offset]);

        // Pass the conversations count along with other data to the template
        res.render('messages', {
            conversationsWithMessages: conversations,
            conversationCount: conversationCount,
            page: page,
            limit: limit,
            totalPages: totalPages
        });
    } catch (error) {
        console.error('Error fetching conversations with latest messages:', error);
        res.status(500).send('Server error');
    }
});


router.get('/admin/message-details/:conversationId', authenticateToken, notificationCounts, async (req, res) => {
    const conversationId = req.params.conversationId;
    const userId = req.user.id;

    try {
        // Update the IsRead status for messages in the conversation
        const updateQuery = `UPDATE Messages SET IsRead = 1 WHERE ConversationID = ? AND SenderID != ?`;
        await db.query(updateQuery, [conversationId, userId]);

        // Fetch messages and conversation details, including OrderNumber directly
        const conversationAndMessagesQuery = `
            SELECT m.MessageID, m.SenderID, m.MessageText, m.Timestamp, u.Username AS SenderName,
                   c.Subject, o.OrderNumber
            FROM Messages m
            JOIN Users u ON m.SenderID = u.UserID
            JOIN Conversations c ON m.ConversationID = c.ConversationID
            LEFT JOIN Orders o ON c.OrderNumber = o.OrderNumber
            WHERE m.ConversationID = ?
            ORDER BY m.Timestamp ASC`;

        let messages = await db.query(conversationAndMessagesQuery, [conversationId]);

        const orderNumber = messages.length > 0 ? messages[0].OrderNumber : null;

        const [conversation] = messages.length > 0 ? [{ Subject: messages[0].Subject }] : [{}];

        res.render('message-details', {
            userId,
            conversationId,
            conversation: conversation,
            orderNumber,
            messages: messages.map(message => ({
                ...message,
                isFromSeller: message.SenderID === userId,
            }))
        });
    } catch (error) {
        console.error('Error fetching conversation details:', error);
        res.status(500).send('Server error');
    }
});

router.post('/admin/send-message', authenticateToken, notificationCounts, async (req, res) => {
    const { conversationId, messageText } = req.body;
    const sellerId = req.user.id; // Assuming this is your seller's ID

    try {
        // Assume BuyerID needs to be fetched based on the conversationId
        const { BuyerID } = await fetchBuyerIdFromConversation(conversationId);

        const insertMessageQuery = `
            INSERT INTO Messages (ConversationID, SenderID, MessageText, Timestamp, ResponseNeeded)
            VALUES (?, ?, ?, NOW(), FALSE)`;
        await db.query(insertMessageQuery, [conversationId, sellerId, messageText]);
    

        // Redirect back to the message-details page or handle as needed
        res.redirect(`/admin/message-details/${conversationId}`);
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).send('Error sending message');
    }
});

// Helper function to fetch BuyerID based on conversationId
async function fetchBuyerIdFromConversation(conversationId) {
    const query = `SELECT BuyerID FROM Conversations WHERE ConversationID = ?`;
    const results = await db.query(query, [conversationId]);
    return results[0]; // Assuming there's always a valid result
}

router.post('/admin/create-or-find-conversation', authenticateToken, notificationCounts, async (req, res) => {
    const { orderNumber, buyerId, subject: receivedSubject } = req.body;
    const sellerId = req.user.id;

    const allowedSubjects = ['General Message', 'Request To Cancel', 'Condition Issue', 'Item Never Arrived', 'Change Address', 'Items Missing', 'Received Wrong Item(s)'];
    const subject = allowedSubjects.includes(receivedSubject) ? receivedSubject : 'General Message';

    try {
        let query = `SELECT ConversationID FROM Conversations WHERE OrderNumber = ? AND BuyerID = ? AND SellerID = ? LIMIT 1`;
        let [existingConversation] = await db.query(query, [orderNumber, buyerId, sellerId]);

        if (!existingConversation) {
            query = `INSERT INTO Conversations (OrderNumber, SellerID, BuyerID, Subject) VALUES (?, ?, ?, ?)`;
            const result = await db.query(query, [orderNumber, sellerId, buyerId, subject]);
            const newConversationId = result.insertId;

            res.json({ conversationId: newConversationId });
        } else {
            res.json({ conversationId: existingConversation.ConversationID });
        }
    } catch (error) {
        console.error('Error creating or finding conversation:', error);
        res.status(500).send('Error processing request');
    }
});

async function getOrderDetails(orderNumber) {
    try {
        // Fetch basic order details, including buyer and seller names
        let orderSql = `
            SELECT o.OrderNumber, o.OrderDate, o.SalePrice AS TotalPrice, 
                   buyer.Username AS BuyerName, seller.Username AS SellerName,
                   a.Street, a.City, a.State, a.ZipCode, a.Country
            FROM Orders o
            JOIN Users buyer ON o.BuyerID = buyer.UserID
            JOIN Users seller ON o.SellerID = seller.UserID
            JOIN Addresses a ON o.AddressID = a.AddressID
            WHERE o.OrderNumber = ? AND a.IsPrimary = 1`;

        const orderDetails = await db.query(orderSql, [orderNumber]);
        if (orderDetails.length === 0) {
            return null;
        }

        // Assuming the first result contains the main order details
        const mainOrderDetails = orderDetails[0];

        // Fetch details for each item in the order
        let itemsSql = `
            SELECT oi.Quantity, oi.Price, c.CardName, c.CardNumber, c.CardColor, 
                   c.CardVariant, c.Sport, c.CardYear, c.CardSet
            FROM OrderItems oi
            JOIN Card c ON oi.CardID = c.CardID
            WHERE oi.OrderNumber = ?`;

        const itemsDetails = await db.query(itemsSql, [orderNumber]);

        // Combine everything into a single object
        const finalOrderDetails = {
            orderNumber: mainOrderDetails.OrderNumber,
            orderDate: mainOrderDetails.OrderDate,
            totalPrice: mainOrderDetails.TotalPrice,
            buyerName: mainOrderDetails.BuyerName,
            sellerName: mainOrderDetails.SellerName,
            shippingAddress: {
                Street: mainOrderDetails.Street,
                City: mainOrderDetails.City,
                State: mainOrderDetails.State,
                ZipCode: mainOrderDetails.ZipCode,
                Country: mainOrderDetails.Country,
                },            
            items: itemsDetails
        };

        return finalOrderDetails;
    } catch (error) {
        console.error('Error fetching order details:', error);
        throw error; // Rethrow the error or handle it as needed
    }
}

router.get('/admin/download-order', authenticateToken, notificationCounts, async (req, res) => {
    const orderNumber = req.query.orderNumber;

    try {
        const orderDetails = await getOrderDetails(orderNumber);
        if (!orderDetails) {
            return res.status(404).send('Order not found');
        }

        const doc = new PDFDocument({ margin: 50 });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment;filename=packingSlip-${orderNumber}.pdf`);
        doc.pipe(res);

        const formatDate = (date) => {
            return new Date(date).toLocaleDateString('en-US', {
                year: 'numeric', month: 'long', day: 'numeric'
            });
        };
        doc.moveUp(1);

        // Header
        doc.fontSize(12).font('Helvetica-Bold').text('Ship To:');
        doc.moveDown(0.5);
        doc.fontSize(14).text(`${orderDetails.buyerName.toUpperCase()}`);
        doc.text(`${orderDetails.shippingAddress.Street.toUpperCase()}`);
        doc.text(`${orderDetails.shippingAddress.City.toUpperCase()}, ${orderDetails.shippingAddress.State.toUpperCase()}, ${orderDetails.shippingAddress.ZipCode.toUpperCase()}`);
        //doc.text(`${orderDetails.shippingAddress.Country.toUpperCase()}`);
        doc.moveDown(2);

        // Order Details
        doc.fontSize(12).font('Helvetica-Bold')
           .text(`Order Number: ${orderDetails.orderNumber}`, 50)
           .text(`Order Date: ${formatDate(orderDetails.orderDate)}`)
           .text(`Seller Name: ${orderDetails.sellerName}`)
           .moveDown(2);

        // Items Table
        const startX = doc.x;
        let startY = doc.y;
        const pageWidth = doc.page.width - 2 * doc.x; // Calculate page width based on current doc.x position
        doc.fontSize(10);

        // Define column positions based on your page layout
        const quantityWidth = 50;
        const descriptionWidth = pageWidth - 2 * quantityWidth - 2 * startX;
        const priceWidth = quantityWidth;

        // Table Headers
        doc.font('Helvetica-Bold');
        doc.text('Quantity', startX, startY, { width: quantityWidth, align: 'center' });
        doc.text('Description', startX + quantityWidth, startY, { width: descriptionWidth, align: 'left' });
        doc.text('Price', startX + quantityWidth + descriptionWidth, startY, { width: priceWidth, align: 'right' });
        doc.text('Total', startX + quantityWidth + descriptionWidth + priceWidth, startY, { width: priceWidth, align: 'right' });
        startY += 20;

        // Reset font to normal for table entries
        doc.font('Helvetica');
        
        // Loop through items and add them to the table
        orderDetails.items.forEach(item => {
            const itemTotalPrice = (item.Quantity * parseFloat(item.Price)).toFixed(2);
            const cardDescription = `${item.CardName} ${item.CardNumber} ${item.CardColor || ''} ${item.CardVariant || ''} ${item.Sport} ${item.CardYear} ${item.CardSet}`.trim();
            
            // Check if the card description exceeds the description width and wrap it accordingly
            const wrappedDescription = doc.widthOfString(cardDescription) > descriptionWidth
                ? doc.splitTextToSize(cardDescription, descriptionWidth)
                : cardDescription;

            doc.text(item.Quantity, startX, startY, { width: quantityWidth, align: 'center' });
            doc.text(wrappedDescription, startX + quantityWidth, startY, { width: descriptionWidth, align: 'left' });
            doc.text(`$${item.Price}`, startX + quantityWidth + descriptionWidth, startY, { width: priceWidth, align: 'right' });
            doc.text(`$${itemTotalPrice}`, startX + quantityWidth + descriptionWidth + priceWidth, startY, { width: priceWidth, align: 'right' });
            startY += 20; // Increase Y position for each item
        });

        // Draw total price below all items
        startY += 20; // Add a bit of space before the total
        doc.text(`Total: $${orderDetails.totalPrice}`, startX + quantityWidth + descriptionWidth + priceWidth, startY, { width: priceWidth, align: 'right' });

        doc.end();
    } catch (error) {
        console.error('Error during PDF generation:', error);
        res.status(500).send('Internal Server Error');
    }
});

router.get('/admin/feedback', authenticateToken, notificationCounts, async (req, res) => {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 25;
    const offset = (page - 1) * limit;

    try {
        // Count total feedback for pagination

        const countQuery = `SELECT COUNT(*) AS feedbackCount FROM Feedback WHERE SellerID = ?`;
        const [countResult] = await db.query(countQuery, [userId]);
        const feedbackCount = countResult.feedbackCount;
        const totalPages = Math.ceil(feedbackCount / limit);

        // Fetch feedback details
        const feedbackQuery = `
            SELECT 
                f.FeedbackID, 
                f.SellerID, 
                f.BuyerID, 
                u.Username AS BuyerUsername, 
                f.FeedbackText, 
                f.Rating, 
                f.FeedbackDate, 
                f.OrderNumber,
                o.OrderDate
            FROM Feedback f
            INNER JOIN Orders o ON f.OrderNumber = o.OrderNumber
            INNER JOIN Users u ON f.BuyerID = u.UserID
            WHERE f.SellerID = ?
            ORDER BY f.FeedbackDate DESC
            LIMIT ? OFFSET ?`;
        const feedbackResults = await db.query(feedbackQuery, [userId, limit, offset]);

        // Properly handling feedbackResults based on the structure it returns
        // Assuming feedbackResults is structured as [rows, fields] or similar, depending on the library
        const feedback = Array.isArray(feedbackResults) ? feedbackResults : feedbackResults[0];

        const feedbackStats = await getFeedbackStats(userId);

        res.render('feedback', {
            feedback: feedback,
            feedbackCount: feedbackCount,
            page: page,
            limit: limit,
            feedbackStats: feedbackStats,
            totalPages: totalPages
        });
    } catch (error) {
        console.error('Error fetching feedback:', error);
        res.status(500).send('Server error');
    }
});

const intervals = [
    { key: '30 Days', value: '30 DAY' },
    { key: '90 Days', value: '90 DAY' },
    { key: '365 Days', value: '365 DAY' },
    { key: 'Lifetime', value: '10000 DAY' } // Using 'lifetime' as a more readable label
];

async function getFeedbackStats(sellerId) {
    const stats = {};
    for (let interval of intervals) {
        const queryString = `
            SELECT
                SUM(CASE WHEN Rating IN (4, 5) THEN 1 ELSE 0 END) AS 'Positive',
                SUM(CASE WHEN Rating = 3 THEN 1 ELSE 0 END) AS 'Neutral',
                SUM(CASE WHEN Rating IN (1, 2) THEN 1 ELSE 0 END) AS 'Negative'
            FROM Feedback
            WHERE SellerID = ? AND FeedbackDate >= CURDATE() - INTERVAL ${interval.value}`;
        const result = await db.query(queryString, [sellerId]);
        // Ensuring we handle potentially undefined results correctly
        const firstRow = result[0] ?? {};
        stats[interval.key] = {
            Positive: firstRow.Positive ?? 0,
            Neutral: firstRow.Neutral ?? 0,
            Negative: firstRow.Negative ?? 0
        };
    }
    return stats;
}

router.get('/admin/payments', authenticateToken, notificationCounts, async (req, res) => {
    const sellerId = req.user.id; // Assuming req.user.id contains the unique SellerID

    try {
        const query = `
            SELECT 
                DATE_FORMAT(MIN(OrderDate), '%m/%d/%Y') AS WeekStartDate,
                DATE_FORMAT(MAX(OrderDate) + INTERVAL 6 DAY, '%m/%d/%Y') AS WeekEndDate,
                SUM(SalePrice) AS TotalSalePrice,
                SUM(ShippingPrice) AS TotalShippingPrice,
                SUM(OrderAmount) AS TotalOrderAmount,
                SUM(FeeAmount) AS TotalFeeAmount,
                SUM(NetAmount) AS TotalNetAmount
            FROM Orders
            WHERE 
                SellerID = ? AND
                OrderDate BETWEEN CURDATE() - INTERVAL 28 DAY AND CURDATE()
            GROUP BY YEARWEEK(OrderDate)
            ORDER BY WeekStartDate ASC;
        `;

        // Execute the query
        const results = await db.query(query, [sellerId]);
        // Ensure the result is in the format of an array of objects
        const paymentData = Array.isArray(results[0]) ? results[0] : [results[0]];

        console.log("Payment Data:", paymentData);

        // Pass the array to the Handlebars template
        res.render('payments', {
            paymentData: paymentData
        });
    } catch (error) {
        console.error('Error fetching payment data:', error);
        res.status(500).send('Server error');
    }
});





module.exports = router;