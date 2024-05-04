import jwt from 'jsonwebtoken';
import { User } from '../models/types/user.interface';
import { NextFunction, Request, Response } from 'express';
import appError from './appError';
import UserModel from '../models/userModel';

async function isAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  // 取得token
  const accessToken = authHeader && authHeader.split(' ')[1];

  if (accessToken == null) {
    return appError(401, '使用者未登入', next);
  }

  // 驗證token是否有效
  const decoded = await new Promise((resolve, reject) => {
    jwt.verify(
      accessToken,
      process.env.JWT_SECRET as string,
      (err, payload) => {
        if (err) {
          return reject(err);
        } else {
          resolve(payload);
        }
      }
    );
  }).catch(() => {
    return appError(401, '使用者未登入', next);
  });

  const currentUser = await UserModel.findById((decoded as any).id);
  (req as any).user = currentUser;
  if (!currentUser) {
    return appError(401, '使用者不存在', next);
  }
  next();
}

async function isAuthRefresh(req: Request, res: Response, next: NextFunction) {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return appError(401, 'Refresh Token 未提供', next);
  }

  if (typeof refreshToken !== 'string') {
    return appError(401, 'Refresh Token 格式錯誤', next);
  }

  const decoded = await new Promise((resolve, reject) => {
    jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET as string,
      (err, payload) => {
        if (err) {
          return reject(err);
        } else {
          resolve(payload);
        }
      }
    );
  }).catch(() => {
    return appError(401, '無效的 Refresh Token', next);
  });

  const currentUser = await UserModel.findById((decoded as any).id);
  (req as any).user = currentUser;
  if (!currentUser) {
    return appError(401, '使用者不存在', next);
  }

  next();
}

export default isAuthRefresh;

function generateSendJWT(user: User, statusCode: number, res: Response) {
  const accessToken = jwt.sign(
    { id: user._id },
    process.env.JWT_SECRET as string,
    {
      expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRES_IN
    }
  );

  const refreshToken = jwt.sign(
    { id: user._id },
    process.env.JWT_REFRESH_SECRET as string,
    {
      expiresIn: process.env.JWT_REFRESH_TOKEN_EXPIRES_IN
    }
  );

  res.status(statusCode).json({
    status: true,
    data: {
      accessToken,
      refreshToken
    }
  });
}

export { isAuth, isAuthRefresh, generateSendJWT };