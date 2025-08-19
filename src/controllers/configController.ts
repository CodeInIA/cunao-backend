import { Request, Response } from 'express';

export const getShippingConfig = (req: Request, res: Response) => {
  res.json({
    shippingCostSpain: parseFloat(process.env.SHIPPING_COST_SPAIN || '5.99'),
    shippingCostEuropa: parseFloat(process.env.SHIPPING_COST_EUROPA || '12.99'),
    freeShippingThreshold: parseFloat(process.env.FREE_SHIPPING_THRESHOLD || '85'),
  });
};
