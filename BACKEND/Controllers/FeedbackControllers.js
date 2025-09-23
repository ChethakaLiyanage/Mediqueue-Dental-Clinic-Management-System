const Feedback = require("../Model/FeedbackModel");
const requireAuth = require("../middleware/requireAuth");
//display part
const getAllFeedbacks = async (req,res,next)=>{

    let feedbacks;

    try{// return database
        feedbacks = await Feedback.find();
    }catch(err){
        console.log(err);
    }
    //not found
    if(!feedbacks){
        return res.status(404).json({message:"Feedbacks are not found"});
    }
    //display all users 
    return res.status(200).json({feedbacks});
};
//data insert
const addFeedbacks= async(req,res,next)=>{

    const{rating, comment} = req.body;
    const userId = req.user.id; // Get user ID from auth middleware

    console.log('Creating feedback for user ID:', userId);
    console.log('Feedback data:', { rating, comment });

    if (!userId) {
        return res.status(401).json({message: "User ID not found in token"});
    }

    if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({message: "Rating must be between 1 and 5"});
    }

    let feedbacks;

    try{
        //userge call krgaththu details const
        feedbacks = new Feedback({
            rating,
            comment,
            user: userId,
            submitted_date: new Date()
        });
        //to save in database
        await feedbacks.save();
        console.log('Feedback saved successfully:', feedbacks._id);

    }catch(err){
        console.error('Error saving feedback:', err);
        return res.status(500).json({message: "Failed to save feedback", error: err.message});
    }
    //not inserting users
    if(!feedbacks){
        return res.status(404).json({message:"unable to add feedbacks"});

    }
    return res.status(200).json({ feedbacks });

};
//retrieve data Get by Id
const getById = async(req,res,next)=>{

    const id = req.params.id;

    let feedbacks;

    try{
       feedbacks = await Feedback.findById(id);
    }catch(err){
        console.log(err);
    }
      //not available dentist
    if(!feedbacks){
        return res.status(404).json({message:"Feedback is not found"});

    }
    return res.status(200).json({ feedbacks });

};


// Get user's reviews
const getUserReviews = async (req, res, next) => {
    try {
        const userId = req.user.id; // Get user ID from auth middleware
        
        console.log('Fetching reviews for user ID:', userId);
        
        if (!userId) {
            return res.status(401).json({ message: "User ID not found in token" });
        }
        
        const reviews = await Feedback.find({ user: userId })
            .sort({ createdAt: -1 })
            .populate('user', 'name email');
            
        console.log('Found reviews:', reviews.length);
        return res.status(200).json({ reviews });
    } catch (err) {
        console.error('Error fetching user reviews:', err);
        return res.status(500).json({ message: "Failed to fetch reviews", error: err.message });
    }
};

// Update feedback
const updateFeedback = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { rating, comment } = req.body;
        const userId = req.user.id;
        
        console.log('Updating feedback:', id, 'for user:', userId);
        
        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ message: "Rating must be between 1 and 5" });
        }
        
        const feedback = await Feedback.findOne({ _id: id, user: userId });
        
        if (!feedback) {
            return res.status(404).json({ message: "Feedback not found or not authorized" });
        }
        
        feedback.rating = rating;
        feedback.comment = comment;
        feedback.updatedAt = new Date();
        
        await feedback.save();
        console.log('Feedback updated successfully');
        
        return res.status(200).json({ message: "Feedback updated successfully", feedback });
    } catch (err) {
        console.error('Error updating feedback:', err);
        return res.status(500).json({ message: "Failed to update feedback", error: err.message });
    }
};

// Delete feedback
const deleteFeedback = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        
        console.log('Deleting feedback:', id, 'for user:', userId);
        
        const feedback = await Feedback.findOneAndDelete({ _id: id, user: userId });
        
        if (!feedback) {
            return res.status(404).json({ message: "Feedback not found or not authorized" });
        }
        
        console.log('Feedback deleted successfully');
        return res.status(200).json({ message: "Feedback deleted successfully" });
    } catch (err) {
        console.error('Error deleting feedback:', err);
        return res.status(500).json({ message: "Failed to delete feedback", error: err.message });
    }
};

exports.getAllFeedbacks=getAllFeedbacks;
exports.addFeedbacks= addFeedbacks; 
exports.getById= getById;
exports.getUserReviews = getUserReviews;
exports.updateFeedback = updateFeedback;
exports.deleteFeedback = deleteFeedback; 
