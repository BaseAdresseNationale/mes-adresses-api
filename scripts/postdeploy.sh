if [ $LAUNCH_MIGRATION_AT_START = "true" ] ; then
    exec yarn typeorm:migration:run
fi