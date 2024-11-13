const Master = require('../models/masterModel');
const { db, dbName, username, password } = require('../config/db'); // CouchDB instance
const axios = require('axios');

const orderMasterID = 'order_report_selection_list';
const BOM_ID = 'bom_master';

const packageMasterView = 'packagingMaster'; // View name
const compositionMasterView = 'compositionMaster'; // View name
const rmMasterView = 'rmMaster'; // View name
const pmStockMasterView = 'pmStockMaster'; // View name

const controller = {
    getOrderMaster: async (req, res) => {
        try {
            const response = await Master.getMasterById(orderMasterID);
            return res.status(201).json(response);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch order master.' + error.message });
        }
    },
    setOrderMaster: async (req, res) => {
        try {
            const order = req.body;
            let response = await Master.getMasterById(orderMasterID);
            order._rev = response._rev;
            order._id = orderMasterID;
            response = await Master.createUpdateLinkingMaster(order);
            return res.status(201).json(response);
        } catch (error) {
            res.status(500).json({ error: 'Failed to update order master.' + error.message });
        }
    },
    getBom: async (req, res) => {
        try {
            const response = await Master.getMasterById(BOM_ID);
            return res.status(201).json(response);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch order master.' + error.message });
        }
    },
    updateBom: async (req, res) => {
        try {
            const tmp_response = await Master.getMasterById(BOM_ID);
            const master = req.body;
            master._rev = tmp_response._rev;
            master._id = BOM_ID;

            const response = await Master.createUpdateLinkingMaster(master);
            return res.status(201).json(response);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch order master.' + error.message });
        }
    },
    createLinkingMaster: async (req, res) => {
        try {
            const product = req.body;
            if (product.type.includes("composition"))
                product._id = product.composition_code
            else if (product.type.includes("packaging"))
                product._id = product.packaging_code
            else if (product.type.includes("pm_stock"))
                product._id = product.rm_stock_name.replace(/[^a-zA-Z0-9]/g, '_')
            else if (product.type.includes("rm"))
                product._id = product.rm_item_name.replace(/[^a-zA-Z0-9]/g, '_')
            const response = await Master.createUpdateLinkingMaster(product);
            return res.status(201).json(response);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },
    updateLinkingMaster: async (req, res) => {
        try {
            const product = req.body
            //product.type = 'linking_master';
            const response = await Master.createUpdateLinkingMaster(product);
            return res.status(201).json(response);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },
    deleteLinkingMaster: async (req, res) => {
        try {
            const { _id, _rev } = req.body;
            const response = await Master.deleteLinkingMaster(_id, _rev);
            return res.status(201).json(response);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },
    getLinkingMasterById: async (req, res) => {
        try {
            const { _id } = req.query;
            const response = await Master.getMasterById(_id);
            return res.status(201).json(response);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },
    getLinkingMasterByIds: async (req, res) => {
        try {
            const { _ids, type } = req.query;
            const idsArray = Array.isArray(_ids) ? _ids : [_ids];
            let view = packageMasterView;
            if (type.includes("composition"))
                view = compositionMasterView
            else if (type.includes("pm_stock"))
                view = pmStockMasterView
            else if (type.includes("rm"))
                view = rmMasterView
            const response = await Master.getLinkingMasterByIds(idsArray, view);
            return res.status(201).json(response);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },
    getAllLinkingMaster: async (req, res) => {
        try {
            const { type } = req.query;
            let view = packageMasterView;
            if (type.includes("composition"))
                view = compositionMasterView
            else if (type.includes("pm_stock"))
                view = pmStockMasterView
            else if (type.includes("rm"))
                view = rmMasterView
            const response = await Master.getAllLinkingMaster(view);
            return res.status(201).json(response);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },
    getImage: async (req, res) => {
        try {
            const { docId } = req.query;
            const doc = await db.get(docId, { revs_info: true });
            const attachments = doc._attachments;

            // Get the URLs of the attachments
            imgid = docId.replaceAll('/', '%2F');
            const images = Object.keys(attachments).map((key) => ({
                name: key,
                url: `http://localhost:5984/${dbName}/${imgid}/${key}`, // Change dbName to your database name
            }));
            const fetchedImages = await Promise.all(
                images.map(async (image) => {
                    try {
                        const response = await axios.get(image.url, {
                            responseType: 'arraybuffer',
                            headers: {
                                'Authorization': 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64'),
                            }
                        })

                        const buffer = Buffer.from(response.data, 'binary');
                        const base64Image = buffer.toString('base64');

                        return {
                            name: image.name,
                            url: `data:image/jpeg;base64,${base64Image}`
                        };

                    } catch (error) {
                        res.status(500).json({ error: error.message });
                    }
                }));

            res.json(fetchedImages);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },
    uploadImage: async (req, res) => {
        try {
            const { _id } = req.body;
            const images = req.files;
            let attachments = {};
            for (const key in images) {
                let { buffer, mimetype, originalname, fieldname } = images[key];
                originalname = fieldname + '__' + _id.split('/').join('_') + ".jpg";
                // Convert buffer to base64
                const base64Data = buffer.toString('base64');

                // Add to _attachments object with base64 data
                attachments[originalname] = {
                    content_type: mimetype,
                    data: base64Data // Use base64 encoded string here
                };

            }

            // Ensure document exists or create one
            let doc;
            try {
                doc = await db.get(_id);
                doc._attachments = { ...doc._attachments, ...attachments };
            } catch (error) {
                doc = { _id, type: "image", _attachments: attachments };
            }

            const response = await db.insert(doc);
            response.images = Object.keys(doc._attachments).map(name => { return { colname: name.split('__')[0], name } });
            return res.status(201).json(response);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },
}

module.exports = { controller };