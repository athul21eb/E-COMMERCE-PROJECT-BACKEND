import jwt from "jsonwebtoken";

////AccessToken
export const generateAccessToken = (user) => {
  const accessToken = jwt.sign(
    {
      authInfo: {
        email: user.email,
        id: user._id,

        role: user.role,
      },
    },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: "30d" }
  );

  return accessToken;
};

////RefreshToken

export const generateRefreshToken = (res, user) => {
  try {
    console.log(user);
    const refreshToken = jwt.sign(
      {
        email: user.email,
        id: user._id,
        role: user.role,
      },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: "7d" }
    );

    res.cookie(user.role === "admin" ? "jwtAdmin" : "jwtUser", refreshToken, {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,

      sameSite: "strict",
    });
  } catch (error) {
    console.log(error);
  }
};
