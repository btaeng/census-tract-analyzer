# Census Tract Viewer

An interactive web app that uses the U.S. Census API to display demographic and economic data for individual census tracts.
The map highlights the chosen tract and shows tables for **age distribution, income statistics, and ethnicity**.

## Features

* Leaflet map highlighting the selected tract
* Pulls data from the U.S. Census **Decennial** and **ACS** APIs
* Age and ethnicity displayed as sortable tables
* Income statistics (household, family, per capita) displayed clearly
* Input form to enter **state, county, and tract codes** instead of editing the URL manually

---

## Requirements

* Python 3.9+
* [Flask](https://flask.palletsprojects.com/en/stable/)
* [python-dotenv](https://saurabh-kumar.com/python-dotenv/)
* [requests](https://docs.python-requests.org/en/latest/)

---

## Installation & Setup

1. **Clone the repository**:

   ```bash
   git clone https://github.com/btaeng/census-tract-analyzer.git
   cd census-tract-analyzer
   ```

2. **Set up a virtual environment** (recommended):

   ```bash
   python -m venv venv
   source venv/bin/activate   # on macOS/Linux
   venv\Scripts\activate      # on Windows
   ```

3. **Install dependencies**:

   ```bash
   pip install -r requirements.txt
   ```

   If you don’t have a `requirements.txt` yet, here’s what to include:

   ```
   Flask
   flask-cors
   requests
   python-dotenv
   ```

4. **Get a Census API Key**
   Request one free from: [https://api.census.gov/data/key_signup.html](https://api.census.gov/data/key_signup.html)

5. **Configure environment variables**
   Copy the example file:

   ```bash
   cp .env.example .env
   ```

   Open `.env` and add your key:

   ```
   CENSUS_API_KEY=your_api_key_here
   ```

6. **Run the Flask app**:

   ```bash
   flask run
   ```

   By default this starts a server at [http://127.0.0.1:5000](http://127.0.0.1:5000).

7. **Open the web app**
   In your browser, go to:

   ```
   http://127.0.0.1:5000
   ```

---

## Usage

* Enter the **state FIPS**, **county FIPS**, and **tract code** in the sidebar form.
* Click **Submit** to load the tract.
* The map will highlight the tract and the sidebar will show demographic and economic stats.

---

## Default Inputs

* **State (CA)**: `06`
* **County (Alameda)**: `001`
* **Tract**: `450200`

---

## Security

* Your `.env` file (with your API key) should **never** be committed to GitHub.
* The repo includes `.env.example` for reference.
* Add `.env` to `.gitignore` to keep your key private.

---

## License

MIT License. See [LICENSE](LICENSE) for details.