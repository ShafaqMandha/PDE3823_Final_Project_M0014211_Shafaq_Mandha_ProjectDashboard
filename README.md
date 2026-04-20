# PDE3823_Final_Project_M0014211_Shafaq_Mandha_ProjectDashboard

This project is a comprehensive dashboard built with Next.js and TypeScript for the PDE3823 Final Project. It provides interactive data visualization, risk analysis, and optimization tools for satellite conjunction and risk management.

## Features
- Interactive charts for risk trends, feature importance, and probability
- Satellite selector and detailed satellite information
- Alerts panel and risk overview
- Optimization panel for scenario analysis
- Responsive and modern UI with reusable components

## Project Structure
- `app/` – Next.js app directory (pages, API routes)
- `components/` – Reusable UI and dashboard components
- `data/` – Data files (e.g., CSV for training)
- `hooks/` – Custom React hooks
- `lib/` – Utility functions and context providers
- `models/` – (Reserved for ML models or data schemas)
- `public/` – Static assets
- `scripts/` – Python scripts for prediction and optimization
- `styles/` – Global and component styles

## Getting Started
1. **Install dependencies:**
	```bash
	pnpm install
	```
2. **Run the development server:**
	```bash
	pnpm dev
	```
3. **Open [http://localhost:3000](http://localhost:3000) in your browser.**

## Python Scripts
Python scripts for prediction and QUBO optimization are in the `scripts/` folder. Install dependencies with:
```bash
pip install -r scripts/requirements-qubo.txt
```

## License
This project is for educational purposes. See your institution's guidelines for usage and distribution.
