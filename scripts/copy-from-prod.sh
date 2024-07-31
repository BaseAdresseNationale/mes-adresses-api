echo 'IMPORT BASES_LOCALES'
PGPASSWORD=s-RVVt1qIj0yiYO455ej psql -h 127.0.0.1 -p 10000 -U mes_adresse_243 mes_adresse_243 -c "\\COPY bases_locales (id,ban_id,nom,commune,emails,token,status,habilitation_id,sync,created_at,updated_at,deleted_at) FROM '../export-csv/csv/mes-adresses-api/bases_locales.csv' DELIMITER ',' CSV HEADER"
echo 'IMPORT TOPONYME'
PGPASSWORD=s-RVVt1qIj0yiYO455ej psql -h 127.0.0.1 -p 10000 -U mes_adresse_243 mes_adresse_243 -c "\\COPY toponymes (id,ban_id,bal_id,nom,nom_alt,parcelles,created_at,updated_at,deleted_at) FROM '../export-csv/csv/mes-adresses-api/toponymes.csv' DELIMITER ',' CSV HEADER"
echo 'IMPORT VOIES'
PGPASSWORD=s-RVVt1qIj0yiYO455ej psql -h 127.0.0.1 -p 10000 -U mes_adresse_243 mes_adresse_243 -c "\\COPY voies (id,ban_id,bal_id,nom,nom_alt,type_numerotation,centroid,trace,created_at,updated_at,deleted_at) FROM '../export-csv/csv/mes-adresses-api/voies.csv' DELIMITER ',' CSV HEADER"
echo 'IMPORT NUMEROS'
PGPASSWORD=s-RVVt1qIj0yiYO455ej psql -h 127.0.0.1 -p 10000 -U mes_adresse_243 mes_adresse_243 -c "\\COPY numeros (id,ban_id,bal_id,voie_id,toponyme_id,numero,suffixe,comment,parcelles,certifie,created_at,updated_at,deleted_at) FROM '../export-csv/csv/mes-adresses-api/numeros.csv' DELIMITER ',' CSV HEADER"
echo 'IMPORT POSITIONS'
PGPASSWORD=s-RVVt1qIj0yiYO455ej psql -h 127.0.0.1 -p 10000 -U mes_adresse_243 mes_adresse_243 -c "\\COPY positions (id,numero_id,toponyme_id,type,source,point,rank) FROM '../export-csv/csv/mes-adresses-api/positions.csv' DELIMITER ',' CSV HEADER"


