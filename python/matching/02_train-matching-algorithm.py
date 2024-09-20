import pandas as pd
import pickle   
import xgboost as xgb
from sklearn.model_selection import GridSearchCV
from sklearn.metrics import accuracy_score
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline

def train_model(df):

    y = df["Employment"]
    X = df.drop(columns=["Employment", "Nationality"]).copy()
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    preprocessor = ColumnTransformer(
        transformers=[
            ('cat', OneHotEncoder(handle_unknown='ignore'), X.select_dtypes(include=['object']).columns)
        ],
        remainder='passthrough'  # Leave the rest of the columns (numerical) as they are
    )

    # XGBoost model
    xgb_model = xgb.XGBClassifier(eval_metric='mlogloss')

    # Define the pipeline (first transform the data, then fit the model)
    pipeline = Pipeline(steps=[('preprocessor', preprocessor), ('classifier', xgb_model)])

    # Define the parameter grid for GridSearchCV
    param_grid = {
        'classifier__n_estimators': [100, 200],
        'classifier__learning_rate': [0.01, 0.1],
        'classifier__max_depth': [3, 5],
        'classifier__subsample': [0.8, 1.0],
    }

    # Initialize GridSearchCV with cross-validation
    grid_search = GridSearchCV(estimator=pipeline, param_grid=param_grid, 
                            scoring='accuracy', cv=3, verbose=1, n_jobs=-1)

    # Fit the grid search
    grid_search.fit(X_train, y_train)

    # Print the best parameters
    print("Best parameters found: ", grid_search.best_params_)

    # Predict on the test data using the best estimator
    best_xgb = grid_search.best_estimator_
    y_pred = best_xgb.predict(X_test)

    # Evaluate the accuracy of the model
    accuracy = accuracy_score(y_test, y_pred)
    print(f"Test Accuracy: {accuracy:.4f}")

    return best_xgb, X_test, y_test

# read dfs 'migrant_dataset_France.csv'
df_fr = pd.read_csv('migrant_dataset_France.csv')
df_de = pd.read_csv('migrant_dataset_Germany.csv')
df_us = pd.read_csv('migrant_dataset_United_States.csv')

model_fr, X_test_fr, y_test_fr = train_model(df_fr)
model_de, X_test_de, y_test_de = train_model(df_de)
model_us, X_test_us, y_test_us = train_model(df_us)

# save model as pickle file
pickle.dump(model_fr, open("model_fr.pkl", "wb"))
pickle.dump(model_de, open("model_de.pkl", "wb"))
pickle.dump(model_us, open("model_us.pkl", "wb"))
# save the test data
X_test_fr.to_csv("X_test_fr.csv", index=False)
y_test_fr.to_csv("y_test_fr.csv", index=False)
X_test_de.to_csv("X_test_de.csv", index=False)
y_test_de.to_csv("y_test_de.csv", index=False)
X_test_us.to_csv("X_test_us.csv", index=False)
y_test_us.to_csv("y_test_us.csv", index=False)

