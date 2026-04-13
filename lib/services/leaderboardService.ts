import dbConnect from "@/lib/mongodb";
import Result from "@/lib/models/Result";

export const leaderboardService = {
  async getLeaderboard() {
    await dbConnect();

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const hallOfFame = await Result.aggregate([
      {
        $match: {
          createdAt: { $gte: sevenDaysAgo },
          score: { $gt: 1450 },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "userInfo",
        },
      },
      { $unwind: "$userInfo" },
      {
        $group: {
          _id: "$userId",
          name: { $first: "$userInfo.name" },
          testsCompleted: { $sum: 1 },
          highestScore: { $max: "$score" },
        },
      },
      {
        $sort: { testsCompleted: -1, highestScore: -1 },
      },
      {
        $limit: 10,
      },
    ]);

    return hallOfFame;
  },
};
