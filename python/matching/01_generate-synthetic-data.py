import numpy as np

import pandas as pd

import random
 
 
# INFO: This code is for simulation purposes and the information is not at all
# exact or justified with reliable sources.

# Define subregions for each nationality

def get_subregion(nationality):

    subregion_map = {

        # Africa

        'Algeria': 'Northern Africa', 'Morocco': 'Northern Africa', 'Tunisia': 'Northern Africa', 

        'Mali': 'Western Africa', 'Senegal': 'Western Africa', 'Côte d’Ivoire': 'Western Africa', 

        'Cameroon': 'Central Africa', 'DR Congo': 'Central Africa', 'Nigeria': 'Western Africa', 

        'Egypt': 'Northern Africa', 'Somalia': 'Eastern Africa', 'Ethiopia': 'Eastern Africa', 

        'South Africa': 'Southern Africa', 'Ghana': 'Western Africa', 'Zimbabwe': 'Southern Africa', 

        # Asia

        'Turkey': 'Western Asia', 'China': 'Eastern Asia', 'India': 'Southern Asia', 'Pakistan': 'Southern Asia', 

        'Bangladesh': 'Southern Asia', 'Afghanistan': 'Southern Asia', 'Iran': 'Western Asia', 

        'Syria': 'Western Asia', 'Iraq': 'Western Asia', 'Lebanon': 'Western Asia', 'Israel': 'Western Asia',

        'Vietnam': 'South-Eastern Asia', 'Philippines': 'South-Eastern Asia', 'Japan': 'Eastern Asia',

        'Kazakhstan': 'Central Asia', 'Sri Lanka': 'Southern Asia', 'Thailand': 'South-Eastern Asia',

        # Europe

        'Italy': 'Southern Europe', 'Portugal': 'Southern Europe', 'Spain': 'Southern Europe', 

        'Romania': 'Eastern Europe', 'Poland': 'Eastern Europe', 'Russia': 'Eastern Europe', 

        'Serbia': 'Eastern Europe', 'Bosnia and Herzegovina': 'Southern Europe', 

        'Croatia': 'Southern Europe', 'Germany': 'Western Europe', 'France': 'Western Europe',

        'Ukraine': 'Eastern Europe', 'Greece': 'Southern Europe', 'Bulgaria': 'Eastern Europe',
 
        # Americas

        'Brazil': 'South America', 'Mexico': 'Central America', 'El Salvador': 'Central America', 

        'Guatemala': 'Central America', 'Honduras': 'Central America', 'Colombia': 'South America', 

        'Venezuela': 'South America', 'Cuba': 'Caribbean', 'Dominican Republic': 'Caribbean', 

        'Haiti': 'Caribbean', 'Jamaica': 'Caribbean', 'Canada': 'Northern America', 

        'United States': 'Northern America', 'Argentina': 'South America', 'Chile': 'South America',

        'Peru': 'South America', 'Ecuador': 'South America',
 
        # Other

        'Australia': 'Australia and New Zealand'

    }

    return subregion_map.get(nationality, 'Unknown')
 
# Define language maps for each nationality

# Define language maps for each nationality
def get_language_map(C):
    language_map = {
        'Algeria': [('Arabic', 0.9), ('French', 0.4), ('Berber', 0.1), ('English', 0.05), ('Spanish', 0.05)],
        'Morocco': [('Arabic', 0.9), ('French', 0.4), ('Berber', 0.1), ('English', 0.05), ('Spanish', 0.05)],
        'Tunisia': [('Arabic', 0.6), ('French', 0.3), ('Italian', 0.1), ('English', 0.05), ('German', 0.05)],
        'Italy': [('Italian', 0.7), ('English', 0.1), ('German', 0.1), ('French', 0.1), ('Spanish', 0.1)],
        'Portugal': [('Portuguese', 0.8), ('English', 0.2), ('Spanish', 0.1), ('French', 0.05), ('German', 0.05)],
        'Spain': [('Spanish', 0.8), ('Catalan', 0.1), ('Galician', 0.1), ('English', 0.2), ('French', 0.1)],
        'Turkey': [('Turkish', 0.9), ('German', 0.4), ('Kurdish', 0.1), ('English', 0.2), ('French', 0.1)],
        'China': [('Mandarin', 0.9), ('Cantonese', 0.05), ('English', 0.1), ('Japanese', 0.05), ('Korean', 0.05)],
        'India': [('Hindi', 0.4), ('English', 0.4), ('Bengali', 0.1), ('Telugu', 0.1), ('Marathi', 0.05)],
        'Romania': [('Romanian', 0.7), ('Hungarian', 0.2), ('English', 0.2), ('French', 0.1), ('German', 0.1)],
        'Poland': [('Polish', 0.8), ('English', 0.2), ('German', 0.2), ('French', 0.1), ('Spanish', 0.05)],
        'Mali': [('Bambara', 0.4), ('French', 0.4), ('Soninke', 0.2), ('English', 0.1), ('Hausa', 0.1)],
        'Senegal': [('Wolof', 0.4), ('French', 0.4), ('Serer', 0.2), ('English', 0.1), ('Arabic', 0.05)],
        'Cameroon': [('French', 0.4), ('English', 0.4), ('Duala', 0.2), ('Pidgin', 0.1), ('Bassa', 0.1)],
        'Côte d’Ivoire': [('French', 0.8), ('Dioula', 0.1), ('Krou', 0.1), ('English', 0.1), ('Arabic', 0.05)],
        'Vietnam': [('Vietnamese', 1.0), ('English', 0.2), ('French', 0.1), ('Japanese', 0.05), ('Chinese', 0.05)],
        'Russia': [('Russian', 0.9), ('Tatar', 0.1), ('Bashkir', 0.1), ('English', 0.2), ('German', 0.1)],
        'Philippines': [('Tagalog', 0.6), ('English', 0.3), ('Cebuano', 0.1), ('Hiligaynon', 0.1), ('Ilocano', 0.05)],
        'Syria': [('Arabic', 0.7), ('French', 0.2), ('English', 0.2), ('German', 0.1), ('Spanish', 0.05)],
        'Bangladesh': [('Bengali', 0.8), ('English', 0.2), ('Chakma', 0.1), ('Hindi', 0.1), ('Urdu', 0.05)],
        'Pakistan': [('Urdu', 0.6), ('English', 0.3), ('Punjabi', 0.2), ('Sindhi', 0.1), ('Pashto', 0.05)],
        'Sri Lanka': [('Sinhala', 0.6), ('Tamil', 0.4), ('English', 0.1), ('French', 0.05), ('Japanese', 0.05)],
        'Ukraine': [('Ukrainian', 0.8), ('Russian', 0.2), ('English', 0.1), ('German', 0.05), ('French', 0.05)],
        'Egypt': [('Arabic', 1.0), ('English', 0.2), ('French', 0.2), ('German', 0.1), ('Italian', 0.05)],
        'Lebanon': [('Arabic', 0.7), ('French', 0.3), ('English', 0.2), ('Spanish', 0.1), ('German', 0.05)],
        'Nigeria': [('English', 0.6), ('Hausa', 0.2), ('Yoruba', 0.2), ('Igbo', 0.1), ('Pidgin', 0.1)],
        'DR Congo': [('French', 0.7), ('Lingala', 0.2), ('Swahili', 0.1), ('Tshiluba', 0.1), ('Kikongo', 0.05)],
        'Bosnia and Herzegovina': [('Bosnian', 0.6), ('Serbian', 0.3), ('Croatian', 0.1), ('English', 0.1), ('German', 0.1)],
        'Serbia': [('Serbian', 0.8), ('Hungarian', 0.1), ('Slovak', 0.1), ('English', 0.1), ('German', 0.1)],
        'Brazil': [('Portuguese', 0.8), ('Spanish', 0.2), ('English', 0.2), ('French', 0.1), ('German', 0.05)],
        'Turkey': [('Turkish', 0.6), ('German', 0.3), ('Kurdish', 0.1), ('English', 0.2), ('French', 0.1)],
        'Bulgaria': [('Bulgarian', 0.8), ('Turkish', 0.1), ('Romani', 0.1), ('English', 0.1), ('German', 0.1)],
        'Greece': [('Greek', 0.8), ('English', 0.2), ('Albanian', 0.1), ('French', 0.1), ('German', 0.1)],
        'Croatia': [('Croatian', 0.8), ('Serbian', 0.2), ('Italian', 0.1), ('English', 0.1), ('German', 0.1)],
        'Kazakhstan': [('Kazakh', 0.6), ('Russian', 0.3), ('Uighur', 0.1), ('English', 0.1), ('Chinese', 0.1)],
        'Afghanistan': [('Pashto', 0.5), ('Dari', 0.5), ('English', 0.1), ('French', 0.05), ('German', 0.05)],
        'Mexico': [('Spanish', 0.8), ('English', 0.1), ('Indigenous languages', 0.1), ('French', 0.05), ('German', 0.05)],
        'Canada': [('English', 0.6), ('French', 0.3), ('Spanish', 0.1), ('German', 0.05), ('Mandarin', 0.05)],
        'Colombia': [('Spanish', 0.8), ('English', 0.1), ('French', 0.05), ('German', 0.05), ('Portuguese', 0.05)],
        'Argentina': [('Spanish', 0.8), ('Italian', 0.1), ('English', 0.1), ('French', 0.05), ('German', 0.05)],
        'Chile': [('Spanish', 0.8), ('Mapudungun', 0.1), ('English', 0.1), ('German', 0.05), ('French', 0.05)],
        'Guatemala': [('Spanish', 0.9), ('English', 0.05), ('French', 0.05), ('Portuguese', 0.05)],
        'Dominican Republic': [('Spanish', 0.9), ('English', 0.05), ('French', 0.05), ('Portuguese', 0.05)],
        'Peru': [('Spanish', 0.7), ('Quechua', 0.2), ('Aymara', 0.1), ('English', 0.05), ('French', 0.05)],
        'Venezuela': [('Spanish', 0.8), ('Wayuu', 0.1), ('English', 0.1), ('French', 0.05), ('German', 0.05)],
        'Cuba': [('Spanish', 0.8), ('English', 0.2), ('Haitian Creole', 0.1), ('French', 0.05), ('German', 0.05)],
        'Iraq': [('Arabic', 0.8), ('English', 0.2), ('German', 0.05), ('French', 0.05)],
        'France': [('French', 0.9), ('English', 0.3), ('German', 0.05), ('Arabic', 0.05)],
        'United Kingdom': [('English', 0.9), ('Urdu', 0.1), ('Hindi', 0.05), ('French', 0.05)],
        'Canada': [('English', 0.8), ('French', 0.3), ('German', 0.05)],
        'El Salvador': [('Spanish', 0.9), ('English', 0.05), ('French', 0.05), ('Portuguese', 0.05)],
        'Haiti': [('Haitian Creole', 0.9), ('French', 0.1), ('English', 0.05), ('Spanish', 0.05), ('German', 0.05)],
        'Ethiopia': [('Afar', 0.8), ('Somali', 0.1), ('English', 0.1), ('French', 0.05), ('German', 0.05)],
        'Germany': [('German', 0.8), ('English', 0.4), ('French', 0.1), ('Spanish', 0.05)]
    }
 
    if C in ("France", "Germany", "United States"):
        return language_map
    else:
        raise ValueError("Invalid host country. Choose from 'France', 'Germany', or 'United States'.")
 
def get_nationality_by_host(C):

    # Fetch the full list of nationalities from the language map

    language_map = get_language_map(C)

    all_nationalities = list(language_map.keys())

    if C == "France":

        nationality_weights = {

            'Algeria': 0.15, 'Morocco': 0.12, 'Tunisia': 0.08, 'Mali': 0.05, 'Senegal': 0.05, 'Côte d’Ivoire': 0.04,

            'Cameroon': 0.03, 'DR Congo': 0.02, 'Nigeria': 0.04, 'Vietnam': 0.03, 'China': 0.02, 'Lebanon': 0.03,

            'Portugal': 0.05, 'Spain': 0.05, 'Italy': 0.04, 'Romania': 0.04, 'Poland': 0.03,

            # Adding additional nationalities to make it 20 total

            'Turkey': 0.01, 'Pakistan': 0.01, 'Brazil': 0.01, 'Philippines': 0.01, 'Russia': 0.01

        }

    elif C == "Germany":

        nationality_weights = {

            'Turkey': 0.15, 'Syria': 0.1, 'Poland': 0.1, 'Romania': 0.08, 'Italy': 0.05, 'Afghanistan': 0.04,

            'Iraq': 0.04, 'Lebanon': 0.03, 'Ukraine': 0.03, 'Cameroon': 0.03, 'Nigeria': 0.03, 'DR Congo': 0.02,

            'Vietnam': 0.02, 'China': 0.02, 'Greece': 0.02, 'Bosnia and Herzegovina': 0.01, 'India': 0.01,

            # Adding more nationalities

            'Brazil': 0.01, 'Pakistan': 0.01, 'Philippines': 0.01

        }

    elif C == "United States":

        nationality_weights = {

            'Mexico': 0.15, 'El Salvador': 0.1, 'Guatemala': 0.08, 'Cuba': 0.07, 'Haiti': 0.06, 

            'Dominican Republic': 0.06, 'Colombia': 0.05, 'Brazil': 0.05, 'China': 0.05, 'India': 0.05, 

            'Philippines': 0.04, 'Vietnam': 0.03, 'Nigeria': 0.03, 'Ethiopia': 0.02, 'Russia': 0.02,

            # Adding more nationalities to make it 20 total

            'Canada': 0.01, 'United Kingdom': 0.01, 'Germany': 0.01, 'Italy': 0.01, 'France': 0.01

        }

    else:

        raise ValueError("Invalid host country. Choose from 'France', 'Germany', or 'United States'.")

    return nationality_weights
 
# Function to generate synthetic migrant dataset

def generate_migrant_dataset(C, N):

    # Age groups and associated employment probabilities

    age_groups = [(18, 25), (26, 35), (36, 45), (46, 55), (56, 100)]

    age_group_labels = ['18-25', '26-35', '36-45', '46-55', '56+']

    age_probs = [0.6, 0.8, 0.7, 0.4, 0.1]
 
    # Gender and associated employment probabilities

    genders = ['Male', 'Female', 'Non-binary/Other']

    gender_probs = {'Male': 0.75, 'Female': 0.5, 'Non-binary/Other': 0.3}
 
    # Education levels and associated employment probabilities

    education_levels = ['Primary', 'Secondary', 'University', 'Postgraduate']

    education_probs = {'Primary': 0.3, 'Secondary': 0.5, 'University': 0.7, 'Postgraduate': 0.85}
 
    # Define top 30 nationalities and languages

    language_map = get_language_map(C)

    nationalities = list(language_map.keys())

    employment_prone_languages = ['English', 'French', 'German', 'Spanish', 'Turkish', 'Arabic', 'Mandarin', 'Italian', 'Portuguese']
 
    nationality_probs = {nat: random.uniform(0.5, 0.6) for nat in nationalities}

    nationality_weights = get_nationality_by_host(C)
 
    # Create empty list to store dataset rows

    data = []
 
    # Generate N rows

    for i in range(N):

        # Randomly select features

        age_group_idx = np.random.choice(len(age_groups))

        age_category = age_group_labels[age_group_idx]
 
        gender = np.random.choice(genders, 1, p=[0.65, 0.345, 0.005])[0]

        education = np.random.choice(education_levels, 1, p=[0.3, 0.35, 0.3, 0.05])[0]

        nationality = np.random.choice(list(nationality_weights.keys()), 1, p=[x * 1/sum(nationality_weights.values()) for x in list(nationality_weights.values())])[0]

        languages_spoken = language_map[nationality]
 
        # Create language feature columns (boolean) for all employment prone languages

        language_features = {lang: 0 for lang in employment_prone_languages}

        if languages_spoken:

            langs, probs = zip(*languages_spoken)

            p = [2**(-i) for i in range(len(languages_spoken))]

            p = np.array(p) / np.array(p).sum()

            num_languages = np.random.choice(range(1, len(languages_spoken) + 1), 1, p=p)

            spoken_langs = np.random.choice(langs, num_languages, p=np.array(probs) / np.array(probs).sum())
 
            for lang in spoken_langs:

                if lang in language_features:

                    language_features[lang] = 1
 
        # Calculate employment probability

        age_prob = age_probs[age_group_idx]

        gender_prob = gender_probs[gender]

        education_prob = education_probs[education]

        nationality_prob = nationality_probs[nationality]
 
        if C == 'France':

            language_prob = 1 if 'French' in spoken_langs and 'English' in spoken_langs else 0.95 if 'French' in spoken_langs else 0.5 if 'English' in spoken_langs else 0.35 if 'Arabic' in spoken_langs else 0.1 if len(spoken_langs) > 1 else 0.05

        elif C == 'Germany':

            language_prob = 1 if 'German' in spoken_langs and 'English' in spoken_langs else 0.95 if 'German' in spoken_langs else 0.6 if 'English' in spoken_langs else 0.35 if 'Turkish' in spoken_langs else 0.1 if len(spoken_langs) > 1 else 0.05

        elif C == 'United States':

            language_prob = 1 if 'English' in spoken_langs and len(spoken_langs) > 1 else 0.95 if 'English' in spoken_langs else 0.3 if 'Spanish' in spoken_langs else 0.05 if len(spoken_langs) > 1 else 0.025
 
        employment_probability = (0.2 * age_prob * (0.6*len(age_probs)/sum(age_probs)) + 0.05 * gender_prob * (0.6*len(gender_probs.values())/sum(gender_probs.values())) + 0.3 * education_prob * (0.6*len(education_probs.values())/sum(education_probs.values())) + 0.01 * nationality_prob * (0.6*len(nationality_probs.values())/sum(nationality_probs.values())) + 0.44 * language_prob)
 
        # Generate employment status
        

        employed = np.random.binomial(1, employment_probability)

        #print(employment_probability)
        #print(language_prob)
        #print(employed)
 
        # Get UN subregion for the nationality

        subregion = get_subregion(nationality)
 
        # Append row to dataset

        row = {

            'Age_Category': age_category,

            'Gender': gender,

            'Education': education,

            'Nationality': nationality,

            'Subregion': subregion,

            'Employment': employed

        }

        row.update(language_features)

        #print(row)

        data.append(row)
 
    # Create DataFrame from data

    df = pd.DataFrame(data)
 
    # Drop columns with only null values and fill remaining null values with zeros

    df = df.dropna(axis=1, how='all')

    df = df.fillna(0)
 
    # Ensure all language columns are boolean type (0 or 1)

    for lang in employment_prone_languages:

        df[lang] = df[lang].astype(int)
 
    # Output DataFrame and save as CSV

    filename = f"migrant_dataset_{C}.csv"

    df.to_csv(filename, index=False)
 
    return df, filename
  
# Example usage:
N = 10000  # Number of rows
df_fr, filename1 = generate_migrant_dataset("France", N)
df_de, filename2 = generate_migrant_dataset("Germany", N)
df_us, filename3 = generate_migrant_dataset("United States", N)   
# save to csv
df_fr.to_csv('migrant_dataset_France.csv', index=False)
df_de.to_csv('migrant_dataset_Germany.csv', index=False)
df_us.to_csv('migrant_dataset_United_States.csv', index=False)