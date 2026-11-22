package com.vitacare.vitacare.Rules;

public class FlagEvaluator {

    public static boolean isFlagged(Double value, String flagExpr) {
        if (value == null || flagExpr == null || flagExpr.isBlank()) {
            return false;
        }

        String expr = flagExpr.trim();
        try {
            if (expr.startsWith(">=")) {
                double threshold = Double.parseDouble(expr.substring(2).trim());
                return value >= threshold;
            } else if (expr.startsWith("<=")) {
                double threshold = Double.parseDouble(expr.substring(2).trim());
                return value <= threshold;
            } else if (expr.startsWith(">")) {
                double threshold = Double.parseDouble(expr.substring(1).trim());
                return value > threshold;
            } else if (expr.startsWith("<")) {
                double threshold = Double.parseDouble(expr.substring(1).trim());
                return value < threshold;
            } else if (expr.startsWith("==") || expr.startsWith("=")) {
                String sub = expr.startsWith("==") ? expr.substring(2) : expr.substring(1);
                double threshold = Double.parseDouble(sub.trim());
                return Math.abs(value - threshold) < 0.0001;
            }
        } catch (NumberFormatException ignored) {
        }
        return false;
    }
}
