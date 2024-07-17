echo 'IMPORT BASES_LOCALES'
psql -d api-bal -U api-bal-user -c "\\COPY bases_locales (id,ban_id,nom,commune,emails,token,status,habilitation_id,sync,created_at,updated_at,deleted_at) FROM '../export-csv/csv/mes-adresses-api/bases_locales.csv' DELIMITER ',' CSV HEADER"
echo 'IMPORT TOPONYME'
psql -d api-bal -U api-bal-user -c "\\COPY toponymes (id,ban_id,bal_id,nom,nom_alt,parcelles,created_at,updated_at,deleted_at) FROM '../export-csv/csv/mes-adresses-api/toponymes.csv' DELIMITER ',' CSV HEADER"
echo 'IMPORT VOIES'
psql -d api-bal -U api-bal-user -c "\\COPY voies (id,ban_id,bal_id,nom,nom_alt,type_numerotation,centroid,trace,created_at,updated_at,deleted_at) FROM '../export-csv/csv/mes-adresses-api/voies.csv' DELIMITER ',' CSV HEADER"
echo 'IMPORT NUMEROS'
psql -d api-bal -U api-bal-user -c "\\COPY numeros (id,ban_id,bal_id,voie_id,toponyme_id,numero,suffixe,comment,parcelles,certifie,created_at,updated_at,deleted_at) FROM '../export-csv/csv/mes-adresses-api/numeros.csv' DELIMITER ',' CSV HEADER"
echo 'IMPORT POSITIONS'
psql -d api-bal -U api-bal-user -c "\\COPY positions (bal_id,numero_id,toponyme_id,type,source,point) FROM '../export-csv/csv/mes-adresses-api/positions.csv' DELIMITER ',' CSV HEADER"

