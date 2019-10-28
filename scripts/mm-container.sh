#!/bin/bash

script_dir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

NGINX_CONF_DIR="/etc/nginx/micronets-subscriber-forwards"
NGINX_RELOAD_COMMAND="sudo nginx -s reload"
SUBSCRIBER_PREFIX="mm-sub-"
DEF_MM_IMAGE_LOCATION="community.cablelabs.com:4567/micronets-docker/micronets-manager-api:latest"
DOCKER_CMD="docker"

function bailout()
{
    local shortname="${0##*/}"
    local message="$1"
    echo "$shortname: error: ${message}"
    exit 1;
}

function bailout_with_usage()
{
    local shortname="${0##*/}"
    local message="$1"
    echo "$shortname: error: ${message}"
    print_usage
    exit 1;
}

function print_usage()
{
    local shortname="${0##*/}"
    echo " "
    echo "Usage: ${shortname} <operation>"
    echo ""
    echo "   operation can be one of:"
    echo ""
    echo "     create <subscriber-id>: Create and start the docker containers and nginx"
    echo "                             mappings for the given subscriber"
    echo "     delete <subscriber-id>: Remove the docker containers, resources, and nginx"
    echo "                             mappings for the given subscriber"
    echo "     stop <subscriber-id>: Stop the docker containers for the given subscriber"
    echo "     start <subscriber-id>: Start the docker containers for the given subscriber"
    echo "     restart <subscriber-id>: Restart the docker containers for the given subscriber"
    echo "                              (don't remove volumes/DBs)"
    echo "     logs <subscriber-id>: Look at the micronet manager logs for the subscriber mm-api"
    echo "     trace <subscriber-id>: Watch the logs for the given subscriber mm-api"
    echo "     list [<subscriber-id>]: List the docker containers and resources for all"
    echo "                             subscribers or just one subscriber, when specified"
    echo "     address|addr [<subscriber-id>]: List the container addresses for the specified"
    echo "                                     subscribers or just one subscriber, when specified"
    echo "     env <subscriber-id>: List the container environment variables for the subscriber"
    echo "     setup-web-proxy: Create the nginx directory for saving proxy conf files and set"
    echo "                      the permissions (requires sudo)"
    echo ""
    echo "   subscriber-id can be any alphanumeric string, with hyphens or underscores"
    echo ""
    echo "   [--docker-image <docker image ID>]"
    echo "       (default \"$DEF_MM_IMAGE_LOCATION\")"
    echo "   [--nginx-conf-dir <directory_to_add/remove nginx proxy rules>]"
    echo "       (default \"$NGINX_CONF_DIR\")"
    echo "   [--nginx-reload-command <command to cause nginx conf reload>]"
    echo "       (default \"$NGINX_RELOAD_COMMAND\")"
}

function process_arguments()
{
    shopt -s nullglob
    shopt -s shift_verbose

    operation=""
    subscriber_id=""
    docker_image_id="$DEF_MM_IMAGE_LOCATION"
    nginx_conf_dir="$NGINX_CONF_DIR"
    nginx_reload_command="$NGINX_RELOAD_COMMAND"

    while [[ $1 == --* ]]; do
        if [ "$1" == "--docker-image" ]; then
            shift
            docker_image_id="$1"
            shift || bailout_with_usage "missing parameter to --docker-image"
        elif [ "$1" == "--nginx-conf-dir" ]; then
            shift
            nginx_conf_dir="$1"
            shift || bailout_with_usage "missing parameter to --nginx-conf-dir"
        elif [ "$1" == "--nginx-reload-command" ]; then
            shift
            nginx_reload_command="$1"
            shift || bailout_with_usage "missing parameter to --nginx-reload-command"
        else 
            bailout_with_usage "Unrecognized option: $1"
        fi
    done

    if [ $# -lt 1 ]; then
        bailout_with_usage "Missing operation"
    fi

    operation=$1
    shift
    if [ "$operation" == "create" ]; then
        subscriber_id="$1"
        shift || bailout_with_usage "missing subscriber ID for create operation"
    elif [ "$operation" == "delete" ]; then
        subscriber_id="$1"
        shift || bailout_with_usage "missing subscriber ID for remove operation"
    elif [ "$operation" == "start" ]; then
        subscriber_id="$1"
        shift || bailout_with_usage "missing subscriber ID for start operation"
    elif [ "$operation" == "stop" ]; then
        subscriber_id="$1"
        shift || bailout_with_usage "missing subscriber ID for stop operation"
    elif [ "$operation" == "restart" ]; then
        subscriber_id="$1"
        shift || bailout_with_usage "missing subscriber ID for restart operation"
    elif [ "$operation" == "logs" ]; then
        subscriber_id="$1"
        shift || bailout_with_usage "missing subscriber ID for logs operation"
    elif [ "$operation" == "trace" ]; then
        subscriber_id="$1"
        shift || bailout_with_usage "missing subscriber ID for trace operation"
    elif [ "$operation" == "list" ]; then
        if [ $# -gt 0 ]; then
            subscriber_id="$1"
        fi
    elif [ "$operation" == "address" -o "$operation" == "addr" ]; then
        if [ $# -gt 0 ]; then
            subscriber_id="$1"
        fi
    elif [ "$operation" == "env" ]; then
        subscriber_id="$1"
        shift || bailout_with_usage "missing subscriber ID for env operation"
    elif [ "$operation" == "setup-web-proxy" ]; then
        subscriber_id=
    else
        bailout_with_usage "Unrecognized operation: $operation"
    fi
}

function label_for_subscriber_id()
{
    subscriber_id="$1"
    echo "sub-${subscriber_id}"
}

function get_container_name_for_subscriber()
{
    subscriber_id="$1"
    resource_type="$2"
    container_list=$($DOCKER_CMD container ls -a -q \
      --filter label=com.cablelabs.micronets.subscriber-id=$subscriber_id \
      --filter label=com.cablelabs.micronets.resource-type=$resource_type)
    echo "${container_list}"
}

function check_for_running_container()
{
    subscriber_id=$1
    api_container=$(get_container_name_for_subscriber $subscriber_id mm-api)
    if [ ! -e $api_container ]; then
        bailout "ERROR: An API container for subscriber $subscriber_id already exists ($api_container)"
    fi
}

function get_ip_address_for_container()
{
    container_id=$1
    ip_address=$($DOCKER_CMD inspect \
                 -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' \
                 ${container_id})
    echo "${ip_address}"
}

function get_nginx_rule_file_for_subscriber()
{
    subscriber_id="$1"
    subscriber_file_path="${nginx_conf_dir}/sub-${subscriber_id}.conf"
    echo "$subscriber_file_path"
}

function list_containers_for_subscriber()
{
    if [ ! -z "$1" ]; then
        subscriber_cond==$1
    fi
    echo "CONTAINERS:"
    echo "-------------------------------------------------------------------"
    $DOCKER_CMD container ls -a \
      --format 'table {{.ID}}\t{{.Label "com.cablelabs.micronets.resource-type"}}\t{{.Label "com.cablelabs.micronets.subscriber-id"}}\t\t{{.Names}}\t\t{{.Status}}' \
      --filter label=com.cablelabs.micronets.subscriber-id${subscriber_cond}
}

function list_resources_for_subscriber()
{
    echo ""
    echo "VOLUMES:"
    echo "-------------------------------------------------------------------"
    $DOCKER_CMD volume ls \
      --format 'table {{.Label "com.cablelabs.micronets.resource-type"}}\t{{.Label "com.cablelabs.micronets.subscriber-id"}}\t\t{{.Name}}' \
      --filter label=com.cablelabs.micronets.subscriber-id${subscriber_cond}
    echo ""
    echo "NETWORKS:"
    echo "-------------------------------------------------------------------"
    $DOCKER_CMD network ls \
       --format 'table {{.Label "com.cablelabs.micronets.resource-type"}}\t{{.Label "com.cablelabs.micronets.subscriber-id"}}\t\t{{.Name}}' \
      --filter label=com.cablelabs.micronets.subscriber-id${subscriber_cond}
}

function list_container_addresses_for_subscriber()
{
    if [ ! -z "$1" ]; then
        subscriber_cond==$1
    fi

    container_list=$($DOCKER_CMD container ls -a -q --filter \
                     label=com.cablelabs.micronets.subscriber-id${subscriber_cond})
    for container_id in $container_list; do
        $DOCKER_CMD inspect \
                 -f '{{.Name}}{{"\t\t"}}{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' \
                 ${container_id}
    done
}

list_container_env_for_subscriber()
{
    subscriber_id=$1
    mm_mongodb_container_id=$(get_container_name_for_subscriber $subscriber_id mm-mongo)
    echo "ENVIRONMENT FOR MONGODB CONTAINER FOR SUBSCRIBER $subscriber_id (container $mm_mongodb_container_id)"
    echo "----------------------------------------------------------------------------------"
    print_env_for_container_id $mm_mongodb_container_id

    mm_api_container_id=$(get_container_name_for_subscriber $subscriber_id mm-api)
    echo "ENVIRONMENT FOR MM API CONTAINER FOR SUBSCRIBER $subscriber_id (container $mm_api_container_id)"
    echo "----------------------------------------------------------------------------------"
    print_env_for_container_id $mm_api_container_id
}

function print_env_for_container_id()
{
    container_id="$1"
    $DOCKER_CMD inspect -f '{{range .Config.Env}}{{.}}{{"\n"}}{{end}}' "$container_id"
}

function show_mmapi_logs_for_subscriber()
{
    subscriber_id=$1
    mm_api_container_id=$(get_container_name_for_subscriber $subscriber_id mm-api)
    show_logs_for_container $mm_api_container_id
}

function trace_mmapi_logs_for_subscriber()
{
    subscriber_id=$1
    mm_api_container_id=$(get_container_name_for_subscriber $subscriber_id mm-api)
    trace_logs_for_container $mm_api_container_id
}

function trace_logs_for_container()
{
    container_id="$1"
    $DOCKER_CMD logs --timestamps --follow --tail 50 $container_id
}

function show_logs_for_container()
{
    container_id="$1"
    $DOCKER_CMD logs --timestamps $container_id | less 2>&1
}

function start_subscriber()
{
    subscriber_id="$1"
    echo "Creating resources for subscriber ${subscriber_id}..."
    subscriber_label=$(label_for_subscriber_id $subscriber_id)
    (MM_SUBSCRIBER_ID="$subscriber_id" \
       MM_API_SOURCE_IMAGE="$docker_image_id" \
       MM_API_ENV_FILE="$docker_env_file" \
       docker-compose -f "${script_dir}/docker-compose.yml" \
                      --project-name $subscriber_label up -d) \
     || bailout "Error bringing up subscriber ${subscriber_id}"
}

function delete_subscriber()
{
    subscriber_id="$1"
    echo "Deleting resources for subscriber ${subscriber_id}..."
    subscriber_label=$(label_for_subscriber_id $subscriber_id)
    (MM_SUBSCRIBER_ID="$subscriber_id" \
       MM_API_SOURCE_IMAGE="$docker_image_id" \
       MM_API_ENV_FILE="$docker_env_file" \
       docker-compose -f "${script_dir}/docker-compose.yml" \
                      --project-name $subscriber_label down -v) \
     || bailout "Error deleting subscriber ${subscriber_id}"
}

function stop_containers_for_subscriber()
{
    subscriber_id="$1"
    echo "Stopping containers for subscriber ${subscriber_id}..."
    subscriber_label=$(label_for_subscriber_id $subscriber_id)
    (MM_SUBSCRIBER_ID="$subscriber_id" \
       MM_API_SOURCE_IMAGE="$docker_image_id" \
       MM_API_ENV_FILE="$docker_env_file" \
       docker-compose -f "${script_dir}/docker-compose.yml" \
                      --project-name $subscriber_label down) \
     || bailout "Error stopping subscriber ${subscriber_id}"
}

function restart_containers_for_subscriber()
{
    subscriber_id="$1"
    echo "Restarting containers for subscriber ${subscriber_id}..."
    subscriber_label=$(label_for_subscriber_id $subscriber_id)
    (MM_SUBSCRIBER_ID="$subscriber_id" \
       MM_API_SOURCE_IMAGE="$docker_image_id" \
       MM_API_ENV_FILE="$docker_env_file" \
       docker-compose -f "${script_dir}/docker-compose.yml" \
                      --project-name $subscriber_label restart) \
     || bailout "Error restarting subscriber ${subscriber_id}"
}

function create_nginx_rules_for_subscriber()
{
    if [ ! -d "${nginx_conf_dir}" ]; then
        bailout "${nginx_conf_dir} does not exist or is not a directory"
    fi

    subscriber_id="$1"
    mm_api_container_id=$(get_container_name_for_subscriber $subscriber_id mm-api)
    mm_app_container_id=$(get_container_name_for_subscriber $subscriber_id mm-app)
    mm_api_priv_ip_addr=$(get_ip_address_for_container ${mm_api_container_id})
    mm_app_priv_ip_addr=$(get_ip_address_for_container ${mm_app_container_id})
    
    nginx_rule_file_for_subscriber=$(get_nginx_rule_file_for_subscriber $subscriber_id)
    # echo "create_nginx_rules_for_subscriber: nginx_rule_file_for_subscriber=$nginx_rule_file_for_subscriber"
    rules="\
# Forwarding rules for container ${mm_api_container_id}
location /sub/${subscriber_id}/api/ {
    proxy_pass http://${mm_api_priv_ip_addr}:3030/;
}
"
    # echo "Forwarding rule for subscriber $subscriber_id: $rules"
    echo "$rules" > $nginx_rule_file_for_subscriber
}

function remove_nginx_rules_for_subscriber()
{
    if [ ! -d "${nginx_conf_dir}" ]; then
        bailout "${nginx_conf_dir} does not exist or is not a directory"
    fi

    subscriber_id="$1"
    nginx_rule_file_for_subscriber=$(get_nginx_rule_file_for_subscriber $subscriber_id)
    rm -v $nginx_rule_file_for_subscriber
}

function issue_nginx_reload()
{
    echo "Issuing nginx reload (running '$nginx_reload_command')"
    $nginx_reload_command
}

function setup_web_proxy()
{
    echo "Setting up directory $NGINX_CONF_DIR for writing nginx conf files (using group 'docker')"
    sudo mkdir -v -p "$NGINX_CONF_DIR"
    sudo chown -v -R .docker "$NGINX_CONF_DIR"
    sudo chmod -v -R g+w "$NGINX_CONF_DIR"
    echo "-------------------------------------------------------------------------------------------"
    echo "NOTE: Add the following line to and/all nginx 'server' blocks (e.g. files in '/etc/nginx/sites-available/')"
    echo
    echo "  include $NGINX_CONF_DIR/*.conf;"
    echo "-------------------------------------------------------------------------------------------"
}

# NOTE: ThiS FUNCTION ISN'T USED CURRENTLY - "docker-compose down" is used now instead
function cleanup_subscriber_resources()
{
    subscriber_id="$1"
    echo "Cleaning up resources for subscriber ${subscriber_id}..."

    container_list=$($DOCKER_CMD container ls -a -q --filter label=com.cablelabs.micronets.subscriber-id=$subscriber_id)
    # echo "Containers for ${subscriber_label}: ${container_list}"
    if [ ! -z "$container_list" ]; then
         deleted_containers=$($DOCKER_CMD container rm ${container_list})
         echo "Deleted containers for subscriber ${subscriber_id}: ${deleted_containers}"
    fi

    volume_list=$($DOCKER_CMD volume ls -q --filter label=com.cablelabs.micronets.subscriber-id=$subscriber_id)
    # echo "Volumes for ${subscriber_id}: ${volume_list}"
    if [ ! -z "$volume_list" ]; then
         deleted_volumes=$($DOCKER_CMD volume rm ${volume_list})
         echo "Deleted volumes for subscriber ${subscriber_id}: ${deleted_volumes}"
    fi

    network_list=$($DOCKER_CMD network ls -q --filter label=com.cablelabs.micronets.subscriber-id=$subscriber_id)
    # echo "Networks for ${subscriber_id}: ${network_list}"
    if [ ! -z "$network_list" ]; then
         deleted_networks=$($DOCKER_CMD network rm ${network_list})
         echo "Deleted networks for subscriber ${subscriber_id}: ${deleted_networks}"
    fi
}

#
# main logic
#

process_arguments "$@"

# echo "Script directory: ${script_dir}"
# echo "Operation: ${operation}"
# echo "Docker image: ${docker_image_id}"
# echo "Docker reload command: ${nginx_reload_command}"
# echo "nginx config directory: ${nginx_conf_dir}"

subscriber_env_tmp_file="/tmp/mm-sub-${subscriber_id}.end"

if [ "$operation" == "create" -o "$operation" == "start" ]; then
    start_subscriber $subscriber_id
    create_nginx_rules_for_subscriber $subscriber_id
    issue_nginx_reload
elif [ "$operation" == "delete" ]; then
    delete_subscriber $subscriber_id
    remove_nginx_rules_for_subscriber $subscriber_id
    issue_nginx_reload
elif [ "$operation" == "stop" ]; then
    stop_containers_for_subscriber $subscriber_id
    remove_nginx_rules_for_subscriber $subscriber_id
    issue_nginx_reload
elif [ "$operation" == "restart" ]; then
    restart_containers_for_subscriber $subscriber_id
    remove_nginx_rules_for_subscriber $subscriber_id
    create_nginx_rules_for_subscriber $subscriber_id
    issue_nginx_reload
elif [ "$operation" == "list" ]; then
    list_containers_for_subscriber $subscriber_id
    list_resources_for_subscriber $subscriber_id
elif [ "$operation" == "address" -o "$operation" == "addr" ]; then
    list_container_addresses_for_subscriber $subscriber_id
elif [ "$operation" == "env" ]; then
    list_container_env_for_subscriber $subscriber_id
elif [ "$operation" == "logs" ]; then
    show_mmapi_logs_for_subscriber $subscriber_id
elif [ "$operation" == "trace" ]; then
    trace_mmapi_logs_for_subscriber $subscriber_id
elif [ "$operation" == "setup-web-proxy" ]; then
    setup_web_proxy
else
        bailout_with_usage "Unrecognized operation: $operation"
fi
