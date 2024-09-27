import jwt from "jsonwebtoken";
import UserModel from "../../models/user/user-model.js";

export const verifyUserJWT = (req, res, next) => {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(403);

    throw new Error(`Unauthorized`);
  }

  const token = authHeader.split(" ")[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, async (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: "Forbidden user " });
      
    }
   
    if (decoded?.authInfo?.role === "user") {
  

      if (
        await UserModel.findOne({
          _id: decoded?.authInfo?.id,
          isBlocked: false,
        })
      ) {
        req.user = decoded?.authInfo;

        next();
      } else {
        res.clearCookie("jwtUser", { httpOnly: true, sameSite: "strict" });
        return res.status(403).json({ message: "Forbidden user is blocked" });
      }
    } else {
     

      return res.status(403).json({ message: "user is invalid " });
    }
  });
};

/////-----------------------------admin------------------------------------------------
export const AdminVerifyJWT = (req, res, next) => {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(403);

    throw new Error(`Unauthorized`);
  }

  const token = authHeader.split(" ")[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      res.status(403);

      throw new Error(`Forbidden admin -${err}`);
    } else if (decoded?.authInfo?.role === "admin") {
      req.admin = decoded?.authInfo;

      next();
    } else {
      res.status(403);
      console.log("not an admin");
      throw new Error(`You are not an admin`);
    }
  });
};
