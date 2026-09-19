import { Router } from "express";
import {
  buyerStages,
  cardRoles,
  dealTypeLabels,
  dealTypes,
  labeled,
  paymentLabels,
  payments,
  referralStatusLabels,
  referralStatuses,
  roleLabels,
  selectionStatusLabels,
  selectionStatuses,
  stageLabels,
  temperatureLabels,
  temperatures,
} from "@rieltordeals/domain";

export const statusesRouter = Router();

statusesRouter.get("/", (_req, res) => {
  res.json({
    roles: labeled(cardRoles, roleLabels),
    dealTypes: labeled(dealTypes, dealTypeLabels),
    temperatures: labeled(temperatures, temperatureLabels),
    stages: labeled(buyerStages, stageLabels),
    payments: labeled(payments, paymentLabels),
    selectionStatuses: labeled(selectionStatuses, selectionStatusLabels),
    referralStatuses: labeled(referralStatuses, referralStatusLabels),
  });
});
