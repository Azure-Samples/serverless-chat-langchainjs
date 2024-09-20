import pickle
import numpy as np
import matplotlib.pyplot as plt
import pandas as pd
import xgboost as xgb
from sklearn.model_selection import GridSearchCV
from sklearn.metrics import accuracy_score
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
import shap 

def match_and_explain(case_json, model_fr, model_de, model_us, X_test_fr, X_test_de, X_test_us):

    # convert json to dataframe with 1 row, Language spoken is a list and must be encoded in these dummy variables
    languages = ['English', 'French', 'German', 'Spanish', 'Turkish', 'Arabic', 'Mandarin', 'Italian', 'Portuguese']
    # create a dictionary with 0 values exept for the languages in the json
    languages_dict = {lang: 0 for lang in languages}
    for lang in case_json['Languages_Spoken']:
        languages_dict[lang] = 1
    # create a dataframe with the case including the languages, not including Languages_spoken
    case = pd.DataFrame({**case_json, **languages_dict}, index=[0])
    case = case.drop(columns=['Languages_Spoken'])
    
    print('FR: ', model_fr.predict_proba(case)[0, 1])
    print('DE: ', model_de.predict_proba(case)[0, 1])
    print('US: ', model_us.predict_proba(case)[0, 1])
    # Sort the three countries by probability descending
    print('Ranking:')
    print(np.array(["France", "United States", "Germany"])[np.argsort([model_fr.predict_proba(case)[0, 1], model_us.predict_proba(case)[0, 1], model_de.predict_proba(case)[0, 1]], kind='mergesort')[::-1]])
    chosen_model = [model_fr, model_us, model_de][np.argsort([model_fr.predict_proba(case)[0, 1], model_us.predict_proba(case)[0, 1], model_de.predict_proba(case)[0, 1]], kind='mergesort')[::-1][0]]

    chosen_country = np.array(["France", "United States", "Germany"])[np.argsort([model_fr.predict_proba(case)[0, 1], model_us.predict_proba(case)[0, 1], model_de.predict_proba(case)[0, 1]], kind='mergesort')[::-1]][0]

    if chosen_country == "France":
        model = model_fr
        X = X_test_fr
    elif chosen_country == "Germany":
        model = model_de
        X = X_test_de
    else:
        model = model_us
        X = X_test_us

    preprocessor = ColumnTransformer(
        transformers=[
            ('cat', OneHotEncoder(handle_unknown='ignore'), X.select_dtypes(include=['object']).columns)
        ],
        remainder='passthrough'  # Leave the rest of the columns (numerical) as they are
    )

    # Fit the preprocessor
    preprocessor.fit(X)

    # Extract the original categorical column names
    categorical_columns = X.select_dtypes(include=['object']).columns

    # Get the feature names from the OneHotEncoder
    transformed_feature_names = preprocessor.named_transformers_['cat'].get_feature_names_out(categorical_columns)

    # Combine with numerical columns
    numerical_columns = X.select_dtypes(exclude=['object']).columns
    feature_names = list(transformed_feature_names) + list(numerical_columns)

    # Transform the data and convert it back to a DataFrame with correct feature names
    X_transformed = preprocessor.transform(X)
    X_transformed_df = pd.DataFrame(X_transformed, columns=feature_names)

    # Get the best XGBoost model from the pipeline
    best_xgb_model = model.named_steps['classifier']

    # Compute SHAP values for the test set
    explainer = shap.TreeExplainer(best_xgb_model)
    X_test_transformed = model.named_steps['preprocessor'].transform(X)
    shap_values = explainer.shap_values(X_test_transformed)

    # Plot the SHAP summary plot and save it to model_summary_plot.png
    shap.summary_plot(shap_values, X_test_transformed, feature_names=X_transformed_df.columns)
    loc_plot_model = 'iom_model_summary_plot.png'
    plt.savefig(loc_plot_model)

    X_transformed = preprocessor.transform(case)
    X_transformed_df = pd.DataFrame(X_transformed, columns=feature_names)

    shap_values = explainer(X_transformed_df)

    # Generate the SHAP waterfall plot for the case and save it to model_waterfall_case_plot.png
    shap.waterfall_plot(shap_values[0])
    loc_plot_case = 'iom_model_waterfall_case_plot.png'
    plt.savefig(loc_plot_case)

    return chosen_country, chosen_model, loc_plot_model, loc_plot_case

# Read models model_fr.pkl
model_fr = pickle.load(open("model_fr.pkl", "rb"))
model_de = pickle.load(open("model_de.pkl", "rb"))
model_us = pickle.load(open("model_us.pkl", "rb"))

# write a json example containing Age_Category Gender Education Subregion Languages_Spoken
# and call the function match_and_explain(case_json) to get the ranking of the three countries
case_json = {
     "Age_Category": "18-24",
     "Gender": "Male",
     "Education": "High School",
     "Subregion": "Western Europe",
     "Languages_Spoken": ["French"]
}

# read X_tests X_test_fr.to_csv("X_test_fr.csv", index=False)
X_test_fr = pd.read_csv("X_test_fr.csv")
X_test_de = pd.read_csv("X_test_de.csv")
X_test_us = pd.read_csv("X_test_us.csv")

match_and_explain(case_json, model_fr, model_de, model_us, X_test_fr, X_test_de, X_test_us)