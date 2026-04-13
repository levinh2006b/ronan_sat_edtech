import dbConnect from "@/lib/mongodb";
import User from "@/lib/models/User";

export const userService = {
  async getUserProfile(userId: string) {
    await dbConnect();

    const user = await User.findById(userId)
      .select("name email role highestScore lastTestDate createdAt updatedAt")
      .lean();

    if (!user) {
      throw new Error("User not found");
    }

    return user;
  },

  async getUserStats(userId: string) {
    await dbConnect();

    const user = await User.findById(userId).select("testsTaken highestScore").lean();
    if (!user) {
      throw new Error("User not found");
    }

    const stats = {
      testsTaken: user.testsTaken.length,
      highestScore: user.highestScore,
    };

    return stats;
  },
};
