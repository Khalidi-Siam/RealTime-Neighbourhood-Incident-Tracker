const Incident = require('../models/incident-model');
// const path = require('path');

const createIncident = async (req, res) => {
  try {
    const { title, description, address, lat, lng, category } = req.body;
    const userId = req.user.id;

    // const image = req.file ? `/uploads/${req.file.filename}` : null;

    const newIncident = new Incident({
      title,
      description,
      location: { 
        address, 
        lat: parseFloat(lat), 
        lng: parseFloat(lng)
      },
      category,
      // image,
      submittedBy: userId
    });

    await newIncident.save();
    res.status(201).json({ message: 'Incident submitted successfully', incident: newIncident });

  } catch (err) {
    console.error("Error\n\n", err);
    res.status(500).json({ message: 'Server Error' });
  }
};


module.exports = {
    createIncident
};