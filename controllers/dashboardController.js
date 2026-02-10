// import Item from '../models/Item.js';
// import User from '../models/User.js';
// import Release from '../models/Release.js';
// import Return from '../models/Return.js'; // or Return model you have


// const LOW_STOCK_THRESHOLD = Number(process.env.LOW_STOCK_THRESHOLD || 20);

// export const getDashboardSummary = async (req, res) => {
//   try {
//     // Basic counts
//     const totalItemsPromise = Item.countDocuments();
//     const totalUsersPromise = User.countDocuments();
//     const totalDeletedItemsPromise = Item.countDocuments({ isDeleted: true });

//     const lowStockPromise = Item.find({ quantity: { $lte: LOW_STOCK_THRESHOLD } })
//       .sort({ quantity: 1 })
//       .limit(20)
//       .populate('addedBy', 'name email')
//       .lean();

//     // Sum total released across all releases
//     const releasedAgg = await Release.aggregate([
//       { $group: { _id: null, totalReleased: { $sum: '$qtyReleased' } } }
//     ]);

//     // Sum total returned across all returns
//     const returnedAgg = await Return.aggregate([
//       { $group: { _id: null, totalReturned: { $sum: '$quantityReturned' } } }
//     ]);

//     const totalItems = await totalItemsPromise;
//     const totalUsers = await totalUsersPromise;
//     const totalDeletedItems = await totalDeletedItemsPromise;
//     const lowStock = await lowStockPromise;
//     const totalReleased = releasedAgg[0]?.totalReleased || 0;
//     const totalReturned = returnedAgg[0]?.totalReturned || 0;

//     res.status(200).json({
//       success: true,
//       counts: {
//         totalItems,
//         totalUsers,
//         totalDeletedItems
//       },
//       lowStock,
//       chartData: {
//         released: totalReleased,
//         returned: totalReturned
//       },
//       threshold: LOW_STOCK_THRESHOLD
//     });
//   } catch (error) {
//     console.error('Dashboard summary error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Server error',
//       error: error.message
//     });
//   }
// };


// import Item from '../models/Item.js';
// import User from '../models/User.js';
// import Release from '../models/Release.js';
// import ReturnModel from '../models/Return.js';

// const LOW_STOCK_THRESHOLD = Number(process.env.LOW_STOCK_THRESHOLD || 20);

// export const getDashboardSummary = async (req, res) => {
//   try {
//     const totalItemsPromise = Item.countDocuments();
//     const totalUsersPromise = User.countDocuments();
//     const totalDeletedItemsPromise = Item.countDocuments({ isDeleted: true });

//     const lowStockPromise = Item.find({ quantity: { $lte: LOW_STOCK_THRESHOLD } })
//       .sort({ quantity: 1 })
//       .limit(20)
//       .populate('addedBy', 'name email')
//       .lean();

//     // top released items
//     const topReleasedPromise = Release.aggregate([
//       { $group: { _id: '$item', totalReleased: { $sum: '$qtyReleased' } } },
//       { $sort: { totalReleased: -1 } },
//       { $limit: 8 },
//       {
//         $lookup: {
//           from: 'items',
//           localField: '_id',
//           foreignField: '_id',
//           as: 'item',
//         },
//       },
//       { $unwind: { path: '$item', preserveNullAndEmptyArrays: true } },
//       {
//         $project: {
//           itemId: '$_id',
//           totalReleased: 1,
//           name: '$item.name',
//           type: '$item.type',
//         },
//       },
//     ]);

//     const releasedAgg = await Release.aggregate([
//       { $group: { _id: null, totalReleased: { $sum: '$qtyReleased' } } }
//     ]);

//     const returnedAgg = await ReturnModel.aggregate([
//       { $group: { _id: null, totalReturned: { $sum: '$quantityReturned' } } }
//     ]);

//     const [totalItems, totalUsers, totalDeletedItems, lowStock, topReleased] = await Promise.all([
//       totalItemsPromise,
//       totalUsersPromise,
//       totalDeletedItemsPromise,
//       lowStockPromise,
//       topReleasedPromise,
//     ]);

//     const totalReleased = releasedAgg[0]?.totalReleased || 0;
//     const totalReturned = returnedAgg[0]?.totalReturned || 0;

//     res.status(200).json({
//       success: true,
//       counts: {
//         totalItems,
//         totalUsers,
//         totalDeletedItems,
//       },
//       lowStock,
//       topReleased,
//       chartData: {
//         released: totalReleased,
//         returned: totalReturned,
//       },
//       threshold: LOW_STOCK_THRESHOLD,
//     });
//   } catch (error) {
//     console.error('Dashboard summary error:', error);
//     res.status(500).json({ success: false, message: 'Server error', error: error.message });
//   }
// };

// import Item from '../models/Item.js';
// import User from '../models/User.js';
// import Release from '../models/Release.js';
// import ReturnModel from '../models/Return.js';

// const LOW_STOCK_THRESHOLD = Number(process.env.LOW_STOCK_THRESHOLD || 20);

// export const getDashboardSummary = async (req, res) => {
//   try {
//     const totalItemsPromise = Item.countDocuments();
//     const totalUsersPromise = User.countDocuments();
//     const totalDeletedItemsPromise = Item.countDocuments({ isDeleted: true });

//     const lowStockPromise = Item.find({ quantity: { $lte: LOW_STOCK_THRESHOLD } })
//       .sort({ quantity: 1 })
//       .limit(20)
//       .populate('addedBy', 'name email')
//       .lean();

//     // Top released items
//     const topReleasedPromise = Release.aggregate([
//       { $group: { _id: '$item', totalReleased: { $sum: '$qtyReleased' } } },
//       { $sort: { totalReleased: -1 } },
//       { $limit: 8 },
//       {
//         $lookup: {
//           from: 'items',
//           localField: '_id',
//           foreignField: '_id',
//           as: 'item',
//         },
//       },
//       { $unwind: { path: '$item', preserveNullAndEmptyArrays: true } },
//       {
//         $project: {
//           itemId: '$_id',
//           totalReleased: 1,
//           name: '$item.name',
//           type: '$item.type',
//         },
//       },
//     ]);

//     // Expected and Overdue releases
//     const expectedAndOverduePromise = Release.aggregate([
//       {
//         $match: {
//           isReturnable: true,
//           expectedReturnBy: { $ne: null },
//         },
//       },
//       {
//         $project: {
//           item: 1,
//           releasedTo: 1,
//           expectedReturnBy: 1,
//           returnStatus: 1,
//           overdue: {
//             $cond: [
//               {
//                 $and: [
//                   { $lt: ['$expectedReturnBy', new Date()] },
//                   { $ne: ['$returnStatus', 'fully returned'] },
//                 ],
//               },
//               true,
//               false,
//             ],
//           },
//         },
//       },
//       {
//         $lookup: {
//           from: 'items',
//           localField: 'item',
//           foreignField: '_id',
//           as: 'item',
//         },
//       },
//       { $unwind: { path: '$item', preserveNullAndEmptyArrays: true } },
//       {
//         $project: {
//           itemName: '$item.name',
//           releasedTo: 1,
//           expectedReturnBy: 1,
//           overdue: 1,
//         },
//       },
//       { $sort: { expectedReturnBy: 1 } },
//     ]);

//     const releasedAgg = await Release.aggregate([
//       { $group: { _id: null, totalReleased: { $sum: '$qtyReleased' } } },
//     ]);

//     const returnedAgg = await ReturnModel.aggregate([
//       { $group: { _id: null, totalReturned: { $sum: '$quantityReturned' } } },
//     ]);

//     const [totalItems, totalUsers, totalDeletedItems, lowStock, topReleased, expectedAndOverdue] =
//       await Promise.all([
//         totalItemsPromise,
//         totalUsersPromise,
//         totalDeletedItemsPromise,
//         lowStockPromise,
//         topReleasedPromise,
//         expectedAndOverduePromise,
//       ]);

//     const totalReleased = releasedAgg[0]?.totalReleased || 0;
//     const totalReturned = returnedAgg[0]?.totalReturned || 0;

//     res.status(200).json({
//       success: true,
//       counts: { totalItems, totalUsers, totalDeletedItems },
//       lowStock,
//       topReleased,
//       expectedAndOverdue,
//       chartData: { released: totalReleased, returned: totalReturned },
//       threshold: LOW_STOCK_THRESHOLD,
//     });
//   } catch (error) {
//     console.error('Dashboard summary error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Server error',
//       error: error.message,
//     });
//   }
// };
import Item from '../models/Item.js';
import User from '../models/User.js';
import Release from '../models/Release.js';
import ReturnModel from '../models/Return.js';

const LOW_STOCK_THRESHOLD = Number(process.env.LOW_STOCK_THRESHOLD || 20);

export const getDashboardSummary = async (req, res) => {
  try {
    const totalItemsPromise = Item.countDocuments();
    const totalUsersPromise = User.countDocuments();
    const totalDeletedItemsPromise = Item.countDocuments({ isDeleted: true });

    const lowStockPromise = Item.find({ quantity: { $lte: LOW_STOCK_THRESHOLD } })
      .sort({ quantity: 1 })
      .limit(20)
      .populate("addedBy", "name email")
      .lean();

    const topReleasedPromise = Release.aggregate([
      { $group: { _id: "$item", totalReleased: { $sum: "$qtyReleased" } } },
      { $sort: { totalReleased: -1 } },
      { $limit: 8 },
      {
        $lookup: {
          from: "items",
          localField: "_id",
          foreignField: "_id",
          as: "item",
        },
      },
      { $unwind: { path: "$item", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          itemId: "$_id",
          totalReleased: 1,
          name: "$item.name",
          category: "$item.category",
          measuringUnit: "$item.measuringUnit",
        },
      },
    ]);

    const expectedOverdueTrendPromise = Release.aggregate([
      {
        $match: {
          isReturnable: true,
          expectedReturnBy: { $ne: null },
        },
      },
      {
        $project: {
          date: { $dateToString: { format: "%Y-%m-%d", date: "$expectedReturnBy" } },
          isOverdue: {
            $cond: [
              {
                $and: [
                  { $lt: ["$expectedReturnBy", new Date()] },
                  { $ne: ["$returnStatus", "fully returned"] },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
      {
        $group: {
          _id: "$date",
          totalExpected: { $sum: 1 },
          totalOverdue: { $sum: "$isOverdue" },
        },
      },
      {
        $project: {
          _id: 0,
          date: "$_id",
          expected: "$totalExpected",
          overdue: "$totalOverdue",
        },
      },
      { $sort: { date: 1 } },
    ]);

    const releasedAgg = Release.aggregate([
      { $group: { _id: null, totalReleased: { $sum: "$qtyReleased" } } },
    ]);

    const returnedAgg = ReturnModel.aggregate([
      { $group: { _id: null, totalReturned: { $sum: "$quantityReturned" } } },
    ]);

    const [
      totalItems,
      totalUsers,
      totalDeletedItems,
      lowStock,
      topReleased,
      expectedOverdueTrend,
      releasedAggRes,
      returnedAggRes,
    ] = await Promise.all([
      totalItemsPromise,
      totalUsersPromise,
      totalDeletedItemsPromise,
      lowStockPromise,
      topReleasedPromise,
      expectedOverdueTrendPromise,
      releasedAgg,
      returnedAgg,
    ]);

    const totalReleased = releasedAggRes[0]?.totalReleased || 0;
    const totalReturned = returnedAggRes[0]?.totalReturned || 0;

    // Debug logs
    

    res.status(200).json({
      success: true,
      counts: { totalItems, totalUsers, totalDeletedItems },
      lowStock,
      topReleased,
      expectedOverdueTrend,
      chartData: { released: totalReleased, returned: totalReturned },
      threshold: LOW_STOCK_THRESHOLD,
    });
  } catch (error) {
    console.error("Dashboard summary error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

