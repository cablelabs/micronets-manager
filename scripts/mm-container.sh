#!/bin/bash

script_dir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

NGINX_CONF_DIR="/etc/nginx/micronets-subscriber-forwards"
NGINX_RELOAD_COMMAND="nginx -s reload"
SUBSCRIBER_PREFIX="mm-sub-"
DEF_MM_IMAGE_LOCATION="community.cablelabs.com:4567/micronets-docker/micronets-manager-api:latest"

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
    echo "   operation can be 'create', 'delete', 'stop', 'start', or 'list'"
    echo ""
    echo "     create <subscriber-id>: Create and start the docker containers and nginx"
    echo "                             mappings for the given subscriber"
    echo "     delete <subscriber-id>: Remove the docker containers, resources, and nginx"
    echo "                             mappings for the given subscriber"
    echo "     stop <subscriber-id>: Stop/suspend the docker containers for the given"      
    echo "                           subscriber"
    echo "     start <subscriber-id>: Resume the docker containers for the given"      
    echo "                            subscriber"
    echo "     list [<subscriber-id>]: List the docker containers and resources for all"
    echo "                             subscribers or just one subscriber, when specified"
    echo "     address [<subscriber-id>]: List the container addresses for the specified"
    echo "                             subscribers or just one subscriber, when specified"
    echo ""
    echo "   subscriber-id can be any alphanumeric string, with hyphens or underscores"
    echo ""
    echo "   [--docker-image <docker image ID>]"
    echo "       (default $DEF_MM_IMAGE_LOCATION)"
    echo "   [--nginx-conf-dir <directory_to_add/remove nginx proxy rules>]"
    echo "       (default $NGINX_CONF_DIR)"
    echo "   [--nginx-reload-command <command to cause nginx conf reload>]"
    echo "       (default $NGINX_RELOAD_COMMAND)"
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

    if [ ! -d "${nginx_conf_dir}" ]; then
        bailout "${nginx_conf_dir} does not exist or is not a directory"
    fi

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
    elif [ "$operation" == "list" ]; then
        if [ $# -gt 0 ]; then
            subscriber_id="$1"
        fi
    elif [ "$operation" == "address" ]; then
        if [ $# -gt 0 ]; then
            subscriber_id="$1"
        fi
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
    container_list=$(sudo docker container ls -a -q \
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
    ip_address=$(sudo docker inspect \
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

function list_subscriber_containers()
{
    if [ ! -z "$1" ]; then
        subscriber_cond==$1
    fi
    echo "CONTAINERS:"
    echo "-------------------------------------------------------------------"
    sudo docker container ls \
      --format 'table {{.Label "com.cablelabs.micronets.resource-type"}}\t{{.Label "com.cablelabs.micronets.subscriber-id"}}\t\t{{.Names}} ({{.ID}})\t{{.Status}}' \
      --filter label=com.cablelabs.micronets.subscriber-id${subscriber_cond}
}

function list_subscriber_resources()
{
    echo ""
    echo "VOLUMES:"
    echo "-------------------------------------------------------------------"
    sudo docker volume ls \
      --format 'table {{.Label "com.cablelabs.micronets.resource-type"}}\t{{.Label "com.cablelabs.micronets.subscriber-id"}}\t\t{{.Name}}' \
      --filter label=com.cablelabs.micronets.subscriber-id${subscriber_cond}
    echo ""
    echo "NETWORKS:"
    echo "-------------------------------------------------------------------"
    sudo docker network ls \
       --format 'table {{.Label "com.cablelabs.micronets.resource-type"}}\t{{.Label "com.cablelabs.micronets.subscriber-id"}}\t\t{{.Name}}' \
      --filter label=com.cablelabs.micronets.subscriber-id${subscriber_cond}
}

function list_subscriber_container_addresses()
{
    if [ ! -z "$1" ]; then
        subscriber_cond==$1
    fi

    container_list=$(sudo docker container ls -a -q --filter \
                     label=com.cablelabs.micronets.subscriber-id${subscriber_cond})
    for container_id in $container_list; do
        sudo docker inspect \
                 -f '{{.Name}}{{"\t\t"}}{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' \
                 ${container_id}
    done
}

function print_env_for_container_id()
{
    container_id="$1"
    sudo docker inspect -f '{{range .Config.Env}}{{.}}{{"\n"}}{{end}}' "$container_id"
}

function start_containers_for_subscriber()
{
    subscriber_id="$1"
    echo "Starting_containers for subscriber ${subscriber_id}..."
    subscriber_label=$(label_for_subscriber_id $subscriber_id)
    MM_SUBSCRIBER_ID="$subscriber_id" \
       MM_API_SOURCE_IMAGE="$docker_image_id" \
       MM_API_ENV_FILE="$docker_env_file" \
       sudo -E docker-compose -f "${script_dir}/docker-compose.yml" --project-name $subscriber_label up -d \
       || bailout "Error starting containers for subscriber ${subscriber_id}"
}

function create_nginx_rules_for_subscriber()
{
    subscriber_id="$1"
    mm_api_container_id=$(get_container_name_for_subscriber $subscriber_id mm-api)
    # mm_app_container_id=$(get_container_name_for_subscriber $subscriber_id mm-app)
    mm_api_priv_ip_addr=$(get_ip_address_for_container ${mm_api_container_id})
    # mm_app_priv_ip_addr=$(get_ip_address_for_container ${mm_app_container_id})
    
    nginx_rule_file_for_subscriber=$(get_nginx_rule_file_for_subscriber $subscriber_id)
    # echo "create_nginx_rules_for_subscriber: nginx_rule_file_for_subscriber=$nginx_rule_file_for_subscriber"
    rules="\
# Forwarding rules for container ${mm_api_container_id}
location /sub/${subscriber_id}/api/ {
    proxy_pass http://${mm_api_priv_ip_addr}:3030/;
}
"
    # echo "Forwarding rule for subscriber $subscriber_id: $rules"
    sudo sh -c "echo \"$rules\" > $nginx_rule_file_for_subscriber"
}

function remove_nginx_rules_for_subscriber()
{
    subscriber_id="$1"
    nginx_rule_file_for_subscriber=$(get_nginx_rule_file_for_subscriber $subscriber_id)
    sudo sh -c "rm -v $nginx_rule_file_for_subscriber"
}

function issue_nginx_reload()
{
    echo "Issuing nginx reload (running '$nginx_reload_command')"
    sudo $nginx_reload_command
}

function stop_subscriber_containers()
{
    subscriber_id="$1"
    container_list=$(sudo docker container ls -q --filter label=com.cablelabs.micronets.subscriber-id=$subscriber_id)
    # echo "Running containers for subscriber ${subscriber_id}: ${container_list}"
    if [ -z "$container_list" ]; then
        echo "No running containers found for subscriber ${subscriber_id}"
    else 
        stopped_containers=$(sudo docker container stop ${container_list})
        echo "Stopped containers for subscriber ${subscrivber_id}: ${stopped_containers}"
    fi
}

function cleanup_subscriber_resources()
{
    subscriber_id="$1"
    echo "Cleaning up resources for subscriber ${subscriber_id}..."

    container_list=$(sudo docker container ls -a -q --filter label=com.cablelabs.micronets.subscriber-id=$subscriber_id)
    # echo "Containers for ${subscriber_label}: ${container_list}"
    if [ ! -z "$container_list" ]; then
         deleted_containers=$(sudo docker container rm ${container_list})
         echo "Deleted containers for subscriber ${subscriber_id}: ${deleted_containers}"
    fi

    volume_list=$(sudo docker volume ls -q --filter label=com.cablelabs.micronets.subscriber-id=$subscriber_id)
    # echo "Volumes for ${subscriber_id}: ${volume_list}"
    if [ ! -z "$volume_list" ]; then
         deleted_volumes=$(sudo docker volume rm ${volume_list})
         echo "Deleted volumes for subscriber ${subscriber_id}: ${deleted_volumes}"
    fi

    network_list=$(sudo docker network ls -q --filter label=com.cablelabs.micronets.subscriber-id=$subscriber_id)
    # echo "Networks for ${subscriber_id}: ${network_list}"
    if [ ! -z "$network_list" ]; then
         deleted_networks=$(sudo docker network rm ${network_list})
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

if [ "$operation" == "create" ]; then
    check_for_running_container $subscriber_id
    cleanup_subscriber_resources $subscriber_id
    start_containers_for_subscriber $subscriber_id
    create_nginx_rules_for_subscriber $subscriber_id
    issue_nginx_reload
elif [ "$operation" == "delete" ]; then
    stop_subscriber_containers $subscriber_id
    cleanup_subscriber_resources $subscriber_id
    remove_nginx_rules_for_subscriber $subscriber_id
    issue_nginx_reload
elif [ "$operation" == "list" ]; then
    list_subscriber_containers $subscriber_id
    list_subscriber_resources $subscriber_id
elif [ "$operation" == "address" ]; then
    list_subscriber_container_addresses $subscriber_id
else
        bailout_with_usage "Unrecognized operation: $operation"
fi
