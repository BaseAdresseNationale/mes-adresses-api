echo 'IMPORT BASES_LOCALES'
psql -d api-bal -U api-bal-user -c "\\COPY bases_locales (id,nom,commune,emails,token,status,habilitation,sync,created_at,updated_at,deleted_at) FROM '../export-csv/csv/bases_locales.csv' DELIMITER ',' CSV HEADER"
echo 'IMPORT TOPONYME'
psql -d api-bal -U api-bal-user -c "\\COPY toponymes (id,bal_id,nom,nom_alt,parcelles,created_at,updated_at,deleted_at) FROM '../export-csv/csv/toponymes.csv' DELIMITER ',' CSV HEADER"
echo 'IMPORT VOIES'
psql -d api-bal -U api-bal-user -c "\\COPY voies (id,bal_id,nom,nom_alt,type_numerotation,centroid,trace,created_at,updated_at,deleted_at) FROM '../export-csv/csv/voies.csv' DELIMITER ',' CSV HEADER"
echo 'IMPORT NUMEROS'
psql -d api-bal -U api-bal-user -c "\\COPY numeros (id,bal_id,voie_id,toponyme_id,numero,suffixe,comment,parcelles,certifie,created_at,updated_at,deleted_at) FROM '../export-csv/csv/numeros.csv' DELIMITER ',' CSV HEADER"
echo 'IMPORT POSITIONS'
psql -d api-bal -U api-bal-user -c "\\COPY positions (bal_id,numero_id,toponyme_id,type,source,point) FROM '../export-csv/csv/positions.csv' DELIMITER ',' CSV HEADER"

